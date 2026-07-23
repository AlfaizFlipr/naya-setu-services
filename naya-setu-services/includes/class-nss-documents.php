<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The single reusable document vault (Q3/Q4 of the brief: upload once, every
 * service reuses it). Files are stored outside the public uploads tree (a
 * private nss-documents/ folder with an .htaccess deny-all) and only ever
 * served through NSS_Rest::document_file(), which checks ownership/capability
 * before streaming — a guessable public URL would otherwise expose Aadhaar/
 * PAN/passport scans to anyone who found the link.
 */
class NSS_Documents
{
	public static function storage_dir()
	{
		$upload_dir = wp_upload_dir();
		$dir = trailingslashit($upload_dir['basedir']) . 'nss-documents';
		if (!file_exists($dir)) {
			wp_mkdir_p($dir);
		}
		$htaccess = $dir . '/.htaccess';
		if (!file_exists($htaccess)) {
			file_put_contents($htaccess, "Deny from all\n");
		}
		$index = $dir . '/index.php';
		if (!file_exists($index)) {
			file_put_contents($index, "<?php\n// Silence is golden.\n");
		}
		return $dir;
	}

	/**
	 * @param array $file One entry from $_FILES (already validated by the caller).
	 * @return array|WP_Error The new document row on success.
	 */
	public static function upload($user_id, $doc_type, array $file)
	{
		if (!isset(NSS_Service_Catalog::DOC_TYPES[$doc_type])) {
			return new WP_Error('nss_bad_doc_type', 'Unknown document type.');
		}
		if (!empty($file['error'])) {
			return new WP_Error('nss_upload_error', 'Upload failed.');
		}

		$allowed_mimes = array('jpg|jpeg' => 'image/jpeg', 'png' => 'image/png', 'pdf' => 'application/pdf', 'webp' => 'image/webp');
		$filetype = wp_check_filetype($file['name'], $allowed_mimes);
		if (!$filetype['type']) {
			return new WP_Error('nss_bad_filetype', 'Only JPG, PNG, WEBP or PDF files are allowed.');
		}
		if ($file['size'] > 5 * 1024 * 1024) {
			return new WP_Error('nss_too_large', 'File must be under 5 MB.');
		}

		$dir = self::storage_dir();
		$safe_name = (int) $user_id . '-' . $doc_type . '-' . time() . '-' . wp_generate_password(6, false) . '.' . $filetype['ext'];
		$dest = $dir . '/' . $safe_name;

		if (!empty($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
			if (!@move_uploaded_file($file['tmp_name'], $dest)) {
				return new WP_Error('nss_move_failed', 'Could not store the uploaded file.');
			}
		} else {
			return new WP_Error('nss_upload_error', 'Invalid upload.');
		}

		global $wpdb;
		$wpdb->insert(
			$wpdb->prefix . 'nss_documents',
			array(
				'user_id' => (int) $user_id,
				'doc_type' => $doc_type,
				'file_path' => $dest,
				'file_name' => sanitize_file_name($file['name']),
				'mime' => $filetype['type'],
				'status' => 'pending',
				'created_at' => current_time('mysql'),
			)
		);

		return self::get((int) $wpdb->insert_id);
	}

	public static function get($id)
	{
		global $wpdb;
		$row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_documents WHERE id = %d', (int) $id), ARRAY_A);
		return $row ?: null;
	}

	public static function url($doc)
	{
		if (!$doc) {
			return '';
		}
		return rest_url(NSS_Rest::NS . '/documents/' . $doc['id'] . '/file');
	}

	public static function list_for_user($user_id)
	{
		global $wpdb;
		return $wpdb->get_results(
			$wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_documents WHERE user_id = %d ORDER BY created_at DESC', (int) $user_id),
			ARRAY_A
		);
	}

	/** Latest non-rejected document of each type for a user — what the form builder offers to reuse. */
	public static function latest_by_type($user_id)
	{
		$rows = self::list_for_user($user_id);
		$out = array();
		foreach ($rows as $row) {
			if ('rejected' === $row['status']) {
				continue;
			}
			if (!isset($out[$row['doc_type']])) {
				$out[$row['doc_type']] = $row;
			}
		}
		return $out;
	}

	public static function delete($id, $user_id)
	{
		$doc = self::get($id);
		if (!$doc || (int) $doc['user_id'] !== (int) $user_id) {
			return new WP_Error('nss_not_found', 'Document not found.');
		}
		global $wpdb;
		if (file_exists($doc['file_path'])) {
			@unlink($doc['file_path']);
		}
		$wpdb->delete($wpdb->prefix . 'nss_documents', array('id' => (int) $id));
		return true;
	}

	public static function verify($id, $verifier_user_id, $status = 'verified')
	{
		if (!in_array($status, array('verified', 'rejected'), true)) {
			return new WP_Error('nss_bad_status', 'Invalid status.');
		}
		global $wpdb;
		$wpdb->update(
			$wpdb->prefix . 'nss_documents',
			array('status' => $status, 'verified_by' => (int) $verifier_user_id, 'verified_at' => current_time('mysql')),
			array('id' => (int) $id)
		);
		return self::get($id);
	}
}
