<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The whole category/service tree, as data — this is the "plugin architecture"
 * from the client brief: adding a new service tomorrow means adding a row here
 * (or, once seeded, editing it in wp-admin -> Service Config) — never touching
 * the form renderer, validator, document vault, status engine or REST layer.
 *
 * defaults() is only ever used to *seed* wp_nss_service_config on install/
 * upgrade (see NSS_Install::seed_service_catalog()) — once a row exists in the
 * DB it is never overwritten by this file again, so admin edits stick.
 */
class NSS_Service_Catalog
{
	const DOC_TYPES = array(
		'photo' => 'Photo',
		'signature' => 'Signature',
		'aadhaar' => 'Aadhaar Card',
		'pan' => 'PAN Card',
		'samagra' => 'Samagra ID Card',
		'passport' => 'Passport',
		'dl' => 'Driving Licence',
		'gst' => 'GST Certificate',
		'cheque' => 'Cancelled Cheque',
		'other' => 'Other Document',
	);

	protected static function fld($name, $label, $type = 'text', $required = true, $options = array())
	{
		$f = array('name' => $name, 'label' => $label, 'type' => $type, 'required' => (bool) $required);
		if (!empty($options)) {
			$f['options'] = $options;
		}
		return $f;
	}

	protected static function svc(array $args)
	{
		return wp_parse_args(
			$args,
			array(
				'fields' => array(),
				'docs' => array('photo', 'signature'),
				'payment_required' => 1,
				'amount' => 299,
				'workflow_mode' => 'manual',
				'api_provider_key' => '',
				'redirect_hash' => '',
			)
		);
	}

	/** A handful of reusable field groups so similar services don't repeat themselves in this file. */
	protected static function tpl_update($subject = 'record')
	{
		return array(
			self::fld('field_to_update', 'Field To Update', 'text', true),
			self::fld('current_value', 'Current Value', 'text', true),
			self::fld('new_value', 'New Value', 'text', true),
			self::fld('reason', 'Reason For Update', 'textarea', false),
		);
	}

	protected static function tpl_status_check($ref_label = 'Reference / Application Number')
	{
		return array(
			self::fld('reference_number', $ref_label, 'text', true),
			self::fld('purpose', 'Purpose', 'text', false),
		);
	}

	protected static function tpl_certificate()
	{
		return array(
			self::fld('applicant_relation', 'Relation To Person Named In Certificate', 'text', true),
			self::fld('purpose_of_certificate', 'Purpose Of Certificate', 'text', true),
			self::fld('place_of_event', 'Place Of Event', 'text', true),
			self::fld('date_of_event', 'Date Of Event', 'date', true),
		);
	}

	protected static function tpl_loan()
	{
		return array(
			self::fld('loan_amount_required', 'Loan Amount Required (Rs.)', 'number', true),
			self::fld('tenure_months', 'Preferred Tenure (Months)', 'number', true),
			self::fld('monthly_income', 'Monthly Income (Rs.)', 'number', true),
			self::fld('existing_emi', 'Existing Monthly EMI Obligations (Rs.)', 'number', false),
		);
	}

	protected static function tpl_insurance()
	{
		return array(
			self::fld('sum_insured', 'Sum Insured (Rs.)', 'number', true),
			self::fld('policy_term_years', 'Policy Term (Years)', 'number', true),
			self::fld('nominee_name', 'Nominee Name', 'text', true),
			self::fld('nominee_relation', 'Nominee Relation', 'text', true),
		);
	}

	protected static function tpl_vehicle($extra = array())
	{
		return array_merge(
			array(self::fld('vehicle_registration_number', 'Vehicle Registration Number', 'text', true)),
			$extra
		);
	}

	public static function defaults()
	{
		$id_docs = array('photo', 'signature', 'aadhaar');

		return array(

			// ============================================================= IDENTITY
			'identity' => array(
				'label' => 'Identity Services',
				'icon' => 'id-card',
				'services' => array(
					self::svc(array(
						'key' => 'aadhaar_new_enrollment', 'label' => 'New Aadhaar Enrollment',
						'fields' => array(
							self::fld('proof_of_identity_type', 'Proof Of Identity Type', 'select', true, array('birth_certificate' => 'Birth Certificate', 'school_id' => 'School ID', 'other' => 'Other')),
							self::fld('proof_of_address_type', 'Proof Of Address Type', 'select', true, array('ration_card' => 'Ration Card', 'utility_bill' => 'Utility Bill', 'other' => 'Other')),
							self::fld('proof_of_dob_type', 'Proof Of Date Of Birth Type', 'select', true, array('birth_certificate' => 'Birth Certificate', 'school_certificate' => 'School Certificate', 'other' => 'Other')),
						),
						'docs' => array('photo', 'other'), 'amount' => 199,
					)),
					self::svc(array(
						'key' => 'aadhaar_update', 'label' => 'Aadhaar Update',
						'fields' => array(
							self::fld('update_type', 'What Do You Want To Update', 'select', true, array('name' => 'Name', 'dob' => 'Date Of Birth', 'gender' => 'Gender', 'address' => 'Address', 'mobile' => 'Mobile', 'email' => 'Email', 'photo' => 'Photo')),
							self::fld('current_value', 'Current Value', 'text', true),
							self::fld('new_value', 'New Value', 'text', true),
							self::fld('reason', 'Reason', 'textarea', false),
						),
						'docs' => array_merge($id_docs, array('other')), 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'aadhaar_mobile_update', 'label' => 'Aadhaar Mobile Update',
						'fields' => array(self::fld('new_mobile_number', 'New Mobile Number', 'tel', true), self::fld('reason', 'Reason', 'text', false)),
						'docs' => $id_docs, 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'aadhaar_address_update', 'label' => 'Aadhaar Address Update',
						'fields' => array(
							self::fld('new_address_line1', 'New Address Line 1', 'text', true),
							self::fld('new_address_line2', 'New Address Line 2', 'text', false),
							self::fld('new_district', 'New District', 'text', true),
							self::fld('new_state', 'New State', 'text', true),
							self::fld('new_pincode', 'New Pincode', 'text', true),
							self::fld('address_proof_type', 'Address Proof Type', 'select', true, array('utility_bill' => 'Utility Bill', 'rent_agreement' => 'Rent Agreement', 'bank_statement' => 'Bank Statement', 'other' => 'Other')),
						),
						'docs' => array_merge($id_docs, array('other')), 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'aadhaar_biometric_update', 'label' => 'Aadhaar Biometric Update',
						'fields' => array(
							self::fld('biometric_type', 'Biometric To Update', 'select', true, array('fingerprint' => 'Fingerprint', 'iris' => 'Iris', 'photo' => 'Photo')),
							self::fld('reason', 'Reason', 'text', true),
							self::fld('appointment_preference', 'Preferred Centre / Date', 'text', false),
						),
						'docs' => $id_docs, 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'aadhaar_pvc_card', 'label' => 'Aadhaar PVC Card Order',
						'fields' => array(
							self::fld('delivery_same_as_profile', 'Deliver To Profile Address', 'checkbox', false),
							self::fld('delivery_address', 'Delivery Address (If Different)', 'textarea', false),
						),
						'docs' => array('aadhaar'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'aadhaar_edownload', 'label' => 'e-Aadhaar Download',
						'fields' => array(self::fld('enrollment_or_aadhaar_number', 'Enrollment / Aadhaar Number', 'text', true), self::fld('otp_mobile', 'OTP-Registered Mobile', 'tel', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'aadhaar_verification', 'label' => 'Aadhaar Verification',
						'fields' => self::tpl_status_check('Aadhaar Number To Verify'),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),

					self::svc(array(
						'key' => 'pan_new', 'label' => 'New PAN',
						'fields' => array(
							self::fld('pan_type', 'PAN Type', 'select', true, array('individual' => 'Individual', 'huf' => 'HUF', 'company' => 'Company', 'firm' => 'Firm/LLP')),
							self::fld('income_source', 'Income Source', 'select', true, array('salary' => 'Salary', 'business' => 'Business', 'capital_gains' => 'Capital Gains', 'other_sources' => 'Other Sources', 'none' => 'No Income Yet')),
							self::fld('ao_code', 'AO Code', 'text', false),
							self::fld('proof_type', 'Proof Type Submitted', 'select', true, array('aadhaar' => 'Aadhaar', 'voter_id' => 'Voter ID', 'passport' => 'Passport', 'other' => 'Other')),
						),
						'docs' => array_merge($id_docs, array('other')), 'amount' => 249,
						'workflow_mode' => 'api', 'api_provider_key' => 'pan_protean',
					)),
					self::svc(array(
						'key' => 'pan_correction', 'label' => 'PAN Correction',
						'fields' => array(
							self::fld('field_to_correct', 'Field To Correct', 'select', true, array('name' => 'Name', 'dob' => 'Date Of Birth', 'father_name' => "Father's Name", 'photo' => 'Photo', 'signature' => 'Signature')),
							self::fld('current_value', 'Current Value', 'text', true),
							self::fld('new_value', 'New Value', 'text', true),
						),
						'docs' => array_merge($id_docs, array('pan', 'other')), 'amount' => 249,
						'workflow_mode' => 'api', 'api_provider_key' => 'pan_protean',
					)),
					self::svc(array(
						'key' => 'pan_reprint', 'label' => 'PAN Reprint',
						'fields' => array(
							self::fld('reason_for_reprint', 'Reason For Reprint', 'select', true, array('lost' => 'Lost', 'damaged' => 'Damaged', 'other' => 'Other')),
							self::fld('delivery_same_as_profile', 'Deliver To Profile Address', 'checkbox', false),
						),
						'docs' => array('pan'), 'amount' => 149,
						'workflow_mode' => 'api', 'api_provider_key' => 'pan_uti',
					)),
					self::svc(array(
						'key' => 'pan_edownload', 'label' => 'e-PAN Download',
						'fields' => array(self::fld('pan_number', 'PAN Number', 'text', true), self::fld('date_of_birth', 'Date Of Birth', 'date', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
						'workflow_mode' => 'api', 'api_provider_key' => 'pan_uti',
					)),
					self::svc(array(
						'key' => 'pan_verification', 'label' => 'PAN Verification',
						'fields' => self::tpl_status_check('PAN Number To Verify'),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
						'workflow_mode' => 'api', 'api_provider_key' => 'pan_protean',
					)),

					self::svc(array(
						'key' => 'samagra_new_registration', 'label' => 'Samagra New Registration',
						'fields' => array(self::fld('family_head_name', 'Family Head Name', 'text', true), self::fld('relation_with_head', 'Your Relation With Head', 'text', true), self::fld('ration_card_number', 'Ration Card Number (If Any)', 'text', false)),
						'docs' => $id_docs, 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'samagra_search', 'label' => 'Search Samagra',
						'fields' => array(self::fld('search_by', 'Search By', 'select', true, array('samagra_id' => 'Samagra ID', 'mobile' => 'Mobile Number', 'name_dob' => 'Name + DOB')), self::fld('search_value', 'Search Value', 'text', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'samagra_download_card', 'label' => 'Download Samagra Card',
						'fields' => array(self::fld('samagra_id', 'Samagra ID', 'text', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'samagra_aadhaar_seeding', 'label' => 'Samagra Aadhaar Seeding',
						'fields' => array(self::fld('samagra_id', 'Samagra ID', 'text', true), self::fld('aadhaar_number', 'Aadhaar Number', 'text', true)),
						'docs' => array('aadhaar'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_mobile_update', 'label' => 'Samagra Mobile Update',
						'fields' => array(self::fld('samagra_id', 'Samagra ID', 'text', true), self::fld('new_mobile_number', 'New Mobile Number', 'tel', true)),
						'docs' => array(), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_address_update', 'label' => 'Samagra Address Update',
						'fields' => array(self::fld('samagra_id', 'Samagra ID', 'text', true), self::fld('new_address_line1', 'New Address Line 1', 'text', true), self::fld('new_district', 'New District', 'text', true), self::fld('new_state', 'New State', 'text', true), self::fld('new_pincode', 'New Pincode', 'text', true)),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_member_add', 'label' => 'Samagra Family Member Add',
						'fields' => array(self::fld('samagra_id', 'Family Samagra ID', 'text', true), self::fld('member_name', 'Member Name', 'text', true), self::fld('relation_with_head', 'Relation With Head', 'text', true), self::fld('member_dob', 'Member Date Of Birth', 'date', true), self::fld('member_gender', 'Member Gender', 'select', true, array('male' => 'Male', 'female' => 'Female', 'other' => 'Other')), self::fld('member_aadhaar', 'Member Aadhaar (If Any)', 'text', false)),
						'docs' => array('aadhaar', 'other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_member_delete', 'label' => 'Samagra Family Member Delete',
						'fields' => array(self::fld('member_samagra_id', 'Member Samagra ID', 'text', true), self::fld('reason', 'Reason', 'select', true, array('death' => 'Death', 'moved_out' => 'Moved To Another Family', 'other' => 'Other'))),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_family_split', 'label' => 'Samagra Family Split',
						'fields' => array(self::fld('members_to_split', 'Member Samagra IDs To Split (Comma Separated)', 'textarea', true), self::fld('new_family_head_name', 'New Family Head Name', 'text', true), self::fld('reason', 'Reason', 'text', false)),
						'docs' => array('other'), 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'samagra_family_merge', 'label' => 'Samagra Family Merge',
						'fields' => array(self::fld('source_family_samagra_id', 'Source Family Samagra ID', 'text', true), self::fld('target_family_samagra_id', 'Target Family Samagra ID', 'text', true), self::fld('reason', 'Reason', 'text', false)),
						'docs' => array('other'), 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'samagra_name_correction', 'label' => 'Samagra Name Correction',
						'fields' => array(self::fld('current_name', 'Current Name', 'text', true), self::fld('corrected_name', 'Corrected Name', 'text', true), self::fld('proof_type', 'Proof Type', 'select', true, array('aadhaar' => 'Aadhaar', 'other' => 'Other'))),
						'docs' => array('aadhaar', 'other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_dob_correction', 'label' => 'Samagra DOB Correction',
						'fields' => array(self::fld('current_dob', 'Current DOB', 'date', true), self::fld('corrected_dob', 'Corrected DOB', 'date', true), self::fld('proof_type', 'Proof Type', 'select', true, array('birth_certificate' => 'Birth Certificate', 'aadhaar' => 'Aadhaar', 'other' => 'Other'))),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_gender_correction', 'label' => 'Samagra Gender Correction',
						'fields' => array(self::fld('current_gender', 'Current Gender', 'text', true), self::fld('corrected_gender', 'Corrected Gender', 'select', true, array('male' => 'Male', 'female' => 'Female', 'other' => 'Other'))),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_relationship_correction', 'label' => 'Samagra Relationship Correction',
						'fields' => array(self::fld('member_samagra_id', 'Member Samagra ID', 'text', true), self::fld('current_relation', 'Current Relation', 'text', true), self::fld('corrected_relation', 'Corrected Relation', 'text', true)),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'samagra_family_verification', 'label' => 'Samagra Family Verification',
						'fields' => array(self::fld('samagra_id', 'Samagra ID', 'text', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'samagra_complaint', 'label' => 'Samagra Complaint',
						'fields' => array(self::fld('complaint_category', 'Complaint Category', 'select', true, array('data_mismatch' => 'Data Mismatch', 'not_updating' => 'Update Not Reflecting', 'other' => 'Other')), self::fld('complaint_details', 'Complaint Details', 'textarea', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),

					self::svc(array(
						'key' => 'voter_new_registration', 'label' => 'Voter ID New Registration',
						'fields' => array(self::fld('age_proof_type', 'Age Proof Type', 'select', true, array('birth_certificate' => 'Birth Certificate', 'aadhaar' => 'Aadhaar', 'other' => 'Other')), self::fld('residence_proof_type', 'Residence Proof Type', 'select', true, array('utility_bill' => 'Utility Bill', 'rent_agreement' => 'Rent Agreement', 'other' => 'Other')), self::fld('previous_voter_state', 'Previously Registered State (If Any)', 'text', false)),
						'docs' => array_merge($id_docs, array('other')), 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'voter_correction', 'label' => 'Voter ID Correction',
						'fields' => array(self::fld('field_to_correct', 'Field To Correct', 'select', true, array('name' => 'Name', 'dob' => 'Date Of Birth', 'address' => 'Address', 'photo' => 'Photo', 'relation' => 'Relation')), self::fld('current_value', 'Current Value', 'text', true), self::fld('new_value', 'New Value', 'text', true)),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'voter_address_change', 'label' => 'Voter ID Address Change',
						'fields' => array(self::fld('new_address_line1', 'New Address Line 1', 'text', true), self::fld('new_district', 'New District', 'text', true), self::fld('new_state', 'New State', 'text', true), self::fld('new_pincode', 'New Pincode', 'text', true)),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'voter_duplicate_card', 'label' => 'Voter ID Duplicate Card',
						'fields' => array(self::fld('epic_number', 'EPIC Number', 'text', true), self::fld('reason', 'Reason', 'select', true, array('lost' => 'Lost', 'damaged' => 'Damaged', 'other' => 'Other'))),
						'docs' => array('other'), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'voter_status_check', 'label' => 'Voter ID Status Check',
						'fields' => self::tpl_status_check('Reference Number'),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'voter_download_eepic', 'label' => 'Download e-EPIC',
						'fields' => array(self::fld('epic_number', 'EPIC Number', 'text', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),

					self::svc(array(
						'key' => 'passport_fresh', 'label' => 'Fresh Passport',
						'fields' => array(
							self::fld('police_station', 'Local Police Station', 'text', true),
							self::fld('emergency_contact_name', 'Emergency Contact Name', 'text', true),
							self::fld('emergency_contact_number', 'Emergency Contact Number', 'tel', true),
							self::fld('ecnr_status', 'ECNR Status', 'select', true, array('ecnr' => 'ECNR', 'non_ecnr' => 'Non-ECNR')),
						),
						'docs' => array_merge($id_docs, array('other')), 'amount' => 499,
					)),
					self::svc(array(
						'key' => 'passport_reissue', 'label' => 'Reissue Passport',
						'fields' => array(
							self::fld('previous_passport_number', 'Previous Passport Number', 'text', true),
							self::fld('previous_passport_issue_date', 'Previous Passport Issue Date', 'date', true),
							self::fld('previous_passport_expiry_date', 'Previous Passport Expiry Date', 'date', true),
							self::fld('police_station', 'Local Police Station', 'text', true),
						),
						'docs' => array_merge($id_docs, array('passport')), 'amount' => 499,
					)),
					self::svc(array(
						'key' => 'passport_tatkal', 'label' => 'Tatkal Passport',
						'fields' => array(
							self::fld('police_station', 'Local Police Station', 'text', true),
							self::fld('emergency_contact_name', 'Emergency Contact Name', 'text', true),
							self::fld('emergency_contact_number', 'Emergency Contact Number', 'tel', true),
							self::fld('urgency_reason', 'Reason For Urgency', 'textarea', true),
						),
						'docs' => array_merge($id_docs, array('other')), 'amount' => 999,
					)),
					self::svc(array(
						'key' => 'passport_pcc', 'label' => 'Police Clearance Certificate (PCC)',
						'fields' => array(self::fld('purpose_of_pcc', 'Purpose Of PCC', 'text', true), self::fld('destination_country', 'Destination Country', 'text', true), self::fld('passport_number', 'Passport Number', 'text', true)),
						'docs' => array('passport', 'photo'), 'amount' => 299,
					)),
					self::svc(array(
						'key' => 'passport_appointment', 'label' => 'Passport Appointment Booking',
						'fields' => array(self::fld('preferred_seva_kendra', 'Preferred Passport Seva Kendra', 'text', true), self::fld('preferred_date', 'Preferred Date', 'date', true), self::fld('preferred_time_slot', 'Preferred Time Slot', 'text', false)),
						'docs' => array(), 'amount' => 99,
					)),
					self::svc(array(
						'key' => 'passport_status_tracking', 'label' => 'Passport Status Tracking',
						'fields' => self::tpl_status_check('File Number / ARS Number'),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),

					self::svc(array(
						'key' => 'dl_learner', 'label' => 'Learner Licence',
						'fields' => array(self::fld('vehicle_class', 'Vehicle Class', 'select', true, array('mcwg' => 'Motorcycle With Gear', 'mcwog' => 'Motorcycle Without Gear', 'lmv' => 'Light Motor Vehicle')), self::fld('test_center_preference', 'Preferred Test Centre', 'text', false)),
						'docs' => $id_docs, 'amount' => 199,
					)),
					self::svc(array(
						'key' => 'dl_permanent', 'label' => 'Permanent Licence',
						'fields' => array(self::fld('learner_licence_number', 'Learner Licence Number', 'text', true), self::fld('vehicle_class', 'Vehicle Class', 'select', true, array('mcwg' => 'Motorcycle With Gear', 'mcwog' => 'Motorcycle Without Gear', 'lmv' => 'Light Motor Vehicle'))),
						'docs' => $id_docs, 'amount' => 299,
					)),
					self::svc(array(
						'key' => 'dl_duplicate', 'label' => 'Duplicate DL',
						'fields' => array(self::fld('dl_number', 'DL Number', 'text', true), self::fld('reason', 'Reason', 'select', true, array('lost' => 'Lost', 'damaged' => 'Damaged'))),
						'docs' => array('dl'), 'amount' => 199,
					)),
					self::svc(array(
						'key' => 'dl_renewal', 'label' => 'DL Renewal',
						'fields' => array(self::fld('dl_number', 'DL Number', 'text', true), self::fld('expiry_date', 'Current Expiry Date', 'date', true)),
						'docs' => array('dl', 'photo'), 'amount' => 199,
					)),
					self::svc(array(
						'key' => 'dl_address_change', 'label' => 'DL Address Change',
						'fields' => array(self::fld('dl_number', 'DL Number', 'text', true), self::fld('new_address_line1', 'New Address Line 1', 'text', true), self::fld('new_district', 'New District', 'text', true), self::fld('new_state', 'New State', 'text', true), self::fld('new_pincode', 'New Pincode', 'text', true)),
						'docs' => array('dl', 'other'), 'amount' => 149,
					)),
					self::svc(array(
						'key' => 'dl_status', 'label' => 'DL Status',
						'fields' => self::tpl_status_check('DL / Application Number'),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),

					self::svc(array(
						'key' => 'abha_create', 'label' => 'Create ABHA',
						'fields' => array(self::fld('linking_method', 'Linking Method', 'select', true, array('aadhaar' => 'Aadhaar', 'mobile' => 'Mobile Number')), self::fld('preferred_health_id', 'Preferred ABHA Address (Optional)', 'text', false)),
						'docs' => array('aadhaar'), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'abha_update', 'label' => 'Update ABHA',
						'fields' => array(self::fld('field_to_update', 'Field To Update', 'select', true, array('mobile' => 'Mobile', 'email' => 'Email', 'address' => 'Address')), self::fld('new_value', 'New Value', 'text', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'abha_download', 'label' => 'Download ABHA Card',
						'fields' => array(self::fld('abha_number', 'ABHA Number', 'text', true)),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
					self::svc(array(
						'key' => 'abha_verification', 'label' => 'ABHA Verification',
						'fields' => self::tpl_status_check('ABHA Number To Verify'),
						'docs' => array(), 'payment_required' => 0, 'amount' => 0,
					)),
				),
			),

			// ============================================================= BUSINESS
			'business' => array(
				'label' => 'Business Services',
				'icon' => 'briefcase',
				'services' => array(
					self::svc(array(
						'key' => 'gst_registration', 'label' => 'GST Registration',
						'fields' => array(
							self::fld('business_type', 'Business Type', 'select', true, array('proprietorship' => 'Proprietorship', 'partnership' => 'Partnership', 'company' => 'Company', 'llp' => 'LLP')),
							self::fld('business_address', 'Business Address', 'textarea', true),
							self::fld('nature_of_business', 'Nature Of Business', 'text', true),
							self::fld('bank_details', 'Bank Account Details', 'textarea', true),
						),
						'docs' => array('pan', 'photo', 'cheque', 'other'), 'amount' => 999,
						'workflow_mode' => 'api', 'api_provider_key' => 'gst_api',
					)),
					self::svc(array(
						'key' => 'gst_amendment', 'label' => 'GST Amendment',
						'fields' => array(self::fld('gstin', 'GSTIN', 'text', true), self::fld('field_to_amend', 'Field To Amend', 'text', true), self::fld('new_value', 'New Value', 'text', true)),
						'docs' => array('gst', 'other'), 'amount' => 399,
						'workflow_mode' => 'api', 'api_provider_key' => 'gst_api',
					)),
					self::svc(array(
						'key' => 'gst_return_filing', 'label' => 'GST Return Filing',
						'fields' => array(self::fld('gstin', 'GSTIN', 'text', true), self::fld('return_period', 'Return Period (MM-YYYY)', 'text', true), self::fld('return_type', 'Return Type', 'select', true, array('gstr1' => 'GSTR-1', 'gstr3b' => 'GSTR-3B', 'other' => 'Other'))),
						'docs' => array('gst', 'other'), 'amount' => 499,
						'workflow_mode' => 'api', 'api_provider_key' => 'gst_api',
					)),
					self::svc(array(
						'key' => 'gst_cancellation', 'label' => 'GST Cancellation',
						'fields' => array(self::fld('gstin', 'GSTIN', 'text', true), self::fld('reason_for_cancellation', 'Reason For Cancellation', 'textarea', true)),
						'docs' => array('gst'), 'amount' => 399,
						'workflow_mode' => 'api', 'api_provider_key' => 'gst_api',
					)),
					self::svc(array(
						'key' => 'msme_registration', 'label' => 'MSME Registration',
						'fields' => array(self::fld('business_type', 'Business Type', 'text', true), self::fld('business_address', 'Business Address', 'textarea', true), self::fld('nature_of_business', 'Nature Of Business', 'text', true), self::fld('investment_in_plant_machinery', 'Investment In Plant/Machinery (Rs.)', 'number', false)),
						'docs' => array('pan', 'aadhaar', 'other'), 'amount' => 299,
					)),
					self::svc(array(
						'key' => 'company_registration', 'label' => 'Company Registration',
						'fields' => array(self::fld('company_type', 'Company Type', 'select', true, array('pvt_ltd' => 'Private Limited', 'public_ltd' => 'Public Limited', 'opc' => 'One Person Company')), self::fld('proposed_company_names', 'Proposed Company Names (Up To 2)', 'textarea', true), self::fld('director_details', 'Director Details', 'textarea', true)),
						'docs' => array_merge($id_docs, array('pan', 'other')), 'amount' => 2999,
					)),
					self::svc(array(
						'key' => 'opc_registration', 'label' => 'OPC Registration',
						'fields' => array(self::fld('proposed_company_name', 'Proposed Company Name', 'text', true), self::fld('nominee_name', 'Nominee Name', 'text', true), self::fld('nominee_details', 'Nominee Details', 'textarea', true)),
						'docs' => array_merge($id_docs, array('pan', 'other')), 'amount' => 2499,
					)),
					self::svc(array(
						'key' => 'llp_registration', 'label' => 'LLP Registration',
						'fields' => array(self::fld('proposed_llp_name', 'Proposed LLP Name', 'text', true), self::fld('partners_details', 'Partners Details', 'textarea', true), self::fld('capital_contribution', 'Capital Contribution (Rs.)', 'number', true)),
						'docs' => array_merge($id_docs, array('pan', 'other')), 'amount' => 2499,
					)),
					self::svc(array(
						'key' => 'partnership_registration', 'label' => 'Partnership Registration',
						'fields' => array(self::fld('firm_name', 'Firm Name', 'text', true), self::fld('partners_details', 'Partners Details', 'textarea', true), self::fld('profit_sharing_ratio', 'Profit Sharing Ratio', 'text', true)),
						'docs' => array_merge($id_docs, array('pan', 'other')), 'amount' => 999,
					)),
					self::svc(array(
						'key' => 'fssai_registration', 'label' => 'FSSAI Registration',
						'fields' => array(self::fld('business_type', 'Business Type', 'select', true, array('manufacturer' => 'Manufacturer', 'trader' => 'Trader', 'restaurant' => 'Restaurant', 'other' => 'Other')), self::fld('license_type', 'License Type', 'select', true, array('basic' => 'Basic', 'state' => 'State', 'central' => 'Central')), self::fld('turnover_range', 'Annual Turnover Range', 'text', true)),
						'docs' => array('pan', 'photo', 'other'), 'amount' => 799,
					)),
					self::svc(array(
						'key' => 'iec_registration', 'label' => 'IEC Registration',
						'fields' => array(self::fld('business_type', 'Business Type', 'text', true), self::fld('bank_details', 'Bank Account Details', 'textarea', true)),
						'docs' => array('pan', 'cheque', 'other'), 'amount' => 999,
					)),
					self::svc(array(
						'key' => 'trademark_registration', 'label' => 'Trademark Registration',
						'fields' => array(self::fld('brand_name', 'Brand Name', 'text', true), self::fld('trademark_class', 'Trademark Class', 'text', true), self::fld('logo_note', 'Logo Uploaded As "Other Document"', 'text', false)),
						'docs' => array('other'), 'amount' => 1999,
					)),
					self::svc(array(
						'key' => 'shop_act_registration', 'label' => 'Shop Act Registration',
						'fields' => array(self::fld('business_name', 'Business Name', 'text', true), self::fld('business_address', 'Business Address', 'textarea', true), self::fld('nature_of_business', 'Nature Of Business', 'text', true), self::fld('number_of_employees', 'Number Of Employees', 'number', false)),
						'docs' => array('pan', 'photo', 'other'), 'amount' => 499,
					)),
					self::svc(array(
						'key' => 'dsc', 'label' => 'Digital Signature Certificate (DSC)',
						'fields' => array(self::fld('dsc_class', 'DSC Class', 'select', true, array('class3' => 'Class 3')), self::fld('dsc_type', 'DSC Type', 'select', true, array('signing' => 'Signing', 'encryption' => 'Encryption', 'both' => 'Signing + Encryption')), self::fld('validity_years', 'Validity (Years)', 'select', true, array('1' => '1 Year', '2' => '2 Years', '3' => '3 Years'))),
						'docs' => array_merge($id_docs, array('pan')), 'amount' => 1499,
					)),
				),
			),

			// ============================================================= BANKING & FINANCE
			'banking' => array(
				'label' => 'Banking & Finance',
				'icon' => 'bank',
				'services' => array_merge(
					array(
						self::svc(array(
							'key' => 'bank_account_opening', 'label' => 'Bank Account Opening',
							'fields' => array(self::fld('account_type', 'Account Type', 'select', true, array('savings' => 'Savings', 'current' => 'Current')), self::fld('branch_preference', 'Preferred Branch', 'text', false), self::fld('initial_deposit_amount', 'Initial Deposit Amount (Rs.)', 'number', false)),
							'docs' => array_merge($id_docs, array('pan', 'photo')), 'amount' => 199,
						)),
						self::svc(array(
							'key' => 'ckyc', 'label' => 'CKYC',
							'fields' => array(self::fld('ckyc_number', 'Existing CKYC Number (If Any)', 'text', false), self::fld('bank_name', 'Bank / Institution Name', 'text', true)),
							'docs' => array_merge($id_docs, array('pan', 'photo')), 'amount' => 149,
							'workflow_mode' => 'api', 'api_provider_key' => 'ckyc',
						)),
						self::svc(array(
							'key' => 'account_verification', 'label' => 'Account Verification',
							'fields' => array(self::fld('account_number', 'Account Number', 'text', true), self::fld('ifsc_code', 'IFSC Code', 'text', true)),
							'docs' => array(), 'payment_required' => 0, 'amount' => 0,
							'workflow_mode' => 'api', 'api_provider_key' => 'penny_drop',
						)),
						self::svc(array(
							'key' => 'penny_drop_verification', 'label' => 'Penny Drop Verification',
							'fields' => array(self::fld('account_number', 'Account Number', 'text', true), self::fld('ifsc_code', 'IFSC Code', 'text', true), self::fld('account_holder_name', 'Expected Account Holder Name', 'text', true)),
							'docs' => array(), 'payment_required' => 0, 'amount' => 0,
							'workflow_mode' => 'api', 'api_provider_key' => 'penny_drop',
						)),
					),
					self::loan_services(),
					self::insurance_services(),
					array(
						self::svc(array(
							'key' => 'credit_card', 'label' => 'Credit Card',
							'fields' => array(self::fld('card_type_preference', 'Card Type Preference', 'select', true, array('basic' => 'Basic', 'rewards' => 'Rewards', 'travel' => 'Travel', 'cashback' => 'Cashback')), self::fld('monthly_income', 'Monthly Income (Rs.)', 'number', true)),
							'docs' => array_merge($id_docs, array('pan')), 'amount' => 0, 'payment_required' => 0,
						)),
						self::svc(array(
							'key' => 'cibil_report', 'label' => 'CIBIL Report',
							'fields' => array(self::fld('pan_number', 'PAN Number', 'text', true), self::fld('consent_confirmation', 'I Consent To Pulling My Credit Report', 'checkbox', true)),
							'docs' => array('pan'), 'amount' => 99,
						)),
					)
				),
			),

			// ============================================================= TRANSPORT
			'transport' => array(
				'label' => 'Transport',
				'icon' => 'car',
				'services' => array(
					self::svc(array('key' => 'rc_services', 'label' => 'RC Services', 'fields' => self::tpl_vehicle(), 'docs' => array('other'), 'amount' => 199)),
					self::svc(array(
						'key' => 'vehicle_ownership_transfer', 'label' => 'Vehicle Ownership Transfer',
						'fields' => self::tpl_vehicle(array(self::fld('buyer_name', 'Buyer Name', 'text', true), self::fld('buyer_address', 'Buyer Address', 'textarea', true), self::fld('seller_declaration', 'Seller Confirms Sale', 'checkbox', true))),
						'docs' => array('other'), 'amount' => 499,
					)),
					self::svc(array(
						'key' => 'vehicle_hypothecation', 'label' => 'Hypothecation',
						'fields' => self::tpl_vehicle(array(self::fld('financier_name', 'Financier Name', 'text', true), self::fld('hypothecation_action', 'Action', 'select', true, array('add' => 'Add', 'remove' => 'Remove')))),
						'docs' => array('other'), 'amount' => 299,
					)),
					self::svc(array(
						'key' => 'vehicle_duplicate_rc', 'label' => 'Duplicate RC',
						'fields' => self::tpl_vehicle(array(self::fld('reason', 'Reason', 'select', true, array('lost' => 'Lost', 'damaged' => 'Damaged')))),
						'docs' => array('other'), 'amount' => 299,
					)),
					self::svc(array('key' => 'vehicle_fitness', 'label' => 'Vehicle Fitness', 'fields' => self::tpl_vehicle(array(self::fld('vehicle_class', 'Vehicle Class', 'text', true))), 'docs' => array('other'), 'amount' => 399)),
					self::svc(array('key' => 'national_permit', 'label' => 'National Permit', 'fields' => self::tpl_vehicle(array(self::fld('states_covered', 'States To Be Covered', 'textarea', true))), 'docs' => array('other'), 'amount' => 799)),
					self::svc(array('key' => 'state_permit', 'label' => 'State Permit', 'fields' => self::tpl_vehicle(array(self::fld('state', 'State', 'text', true), self::fld('route_details', 'Route Details', 'textarea', true))), 'docs' => array('other'), 'amount' => 499)),
					self::svc(array('key' => 'vehicle_tax_payment', 'label' => 'Tax Payment', 'fields' => self::tpl_vehicle(array(self::fld('tax_period', 'Tax Period', 'text', true))), 'docs' => array(), 'amount' => 0, 'payment_required' => 0)),
					self::svc(array('key' => 'challan_payment', 'label' => 'Challan Payment', 'fields' => array(self::fld('vehicle_or_challan_number', 'Vehicle / Challan Number', 'text', true)), 'docs' => array(), 'amount' => 0, 'payment_required' => 0)),
					self::svc(array('key' => 'vehicle_information', 'label' => 'Vehicle Information', 'fields' => self::tpl_vehicle(), 'docs' => array(), 'amount' => 0, 'payment_required' => 0)),
				),
			),

			// ============================================================= REVENUE & LEGAL
			'legal' => array(
				'label' => 'Revenue & Legal Services',
				'icon' => 'scale',
				'services' => array(
					self::svc(array('key' => 'e_stamp', 'label' => 'e-Stamp', 'fields' => array(self::fld('stamp_purpose', 'Stamp Purpose', 'text', true), self::fld('stamp_value_amount', 'Stamp Value (Rs.)', 'number', true), self::fld('state', 'State', 'text', true)), 'docs' => array('other'), 'amount' => 199)),
					self::svc(array('key' => 'affidavit', 'label' => 'Affidavit', 'fields' => array(self::fld('affidavit_purpose', 'Affidavit Purpose', 'text', true), self::fld('affidavit_content', 'Affidavit Content', 'textarea', true)), 'docs' => array_merge($id_docs, array()), 'amount' => 299)),
					self::svc(array('key' => 'rent_agreement', 'label' => 'Rent Agreement', 'fields' => array(self::fld('property_address', 'Property Address', 'textarea', true), self::fld('tenant_name', 'Tenant Name', 'text', true), self::fld('owner_name', 'Owner Name', 'text', true), self::fld('rent_amount', 'Monthly Rent (Rs.)', 'number', true), self::fld('agreement_duration_months', 'Agreement Duration (Months)', 'number', true)), 'docs' => array('other'), 'amount' => 499)),
					self::svc(array('key' => 'sale_agreement', 'label' => 'Sale Agreement', 'fields' => array(self::fld('property_address', 'Property Address', 'textarea', true), self::fld('buyer_name', 'Buyer Name', 'text', true), self::fld('seller_name', 'Seller Name', 'text', true), self::fld('sale_amount', 'Sale Amount (Rs.)', 'number', true)), 'docs' => array('other'), 'amount' => 999)),
					self::svc(array('key' => 'gift_deed', 'label' => 'Gift Deed', 'fields' => array(self::fld('property_address', 'Property Address', 'textarea', true), self::fld('donor_name', 'Donor Name', 'text', true), self::fld('donee_name', 'Donee Name', 'text', true), self::fld('relationship', 'Relationship Between Donor And Donee', 'text', true)), 'docs' => array('other'), 'amount' => 999)),
					self::svc(array('key' => 'property_registration', 'label' => 'Property Registration', 'fields' => array(self::fld('property_address', 'Property Address', 'textarea', true), self::fld('property_type', 'Property Type', 'select', true, array('residential' => 'Residential', 'commercial' => 'Commercial', 'agricultural' => 'Agricultural')), self::fld('transaction_value', 'Transaction Value (Rs.)', 'number', true)), 'docs' => array('other'), 'amount' => 1999)),
					self::svc(array('key' => 'property_mutation', 'label' => 'Property Mutation', 'fields' => array(self::fld('property_address', 'Property Address', 'textarea', true), self::fld('new_owner_name', 'New Owner Name', 'text', true), self::fld('reason', 'Reason', 'select', true, array('sale' => 'Sale', 'inheritance' => 'Inheritance', 'gift' => 'Gift'))), 'docs' => array('other'), 'amount' => 499)),
					self::svc(array('key' => 'encumbrance_certificate', 'label' => 'Encumbrance Certificate', 'fields' => array(self::fld('property_address', 'Property Address', 'textarea', true), self::fld('period_from', 'Period From', 'date', true), self::fld('period_to', 'Period To', 'date', true)), 'docs' => array('other'), 'amount' => 299)),
					self::svc(array('key' => 'legal_notice', 'label' => 'Legal Notice', 'fields' => array(self::fld('notice_purpose', 'Notice Purpose', 'text', true), self::fld('recipient_name', 'Recipient Name', 'text', true), self::fld('recipient_address', 'Recipient Address', 'textarea', true), self::fld('notice_content', 'Notice Content', 'textarea', true)), 'docs' => array(), 'amount' => 599)),
					self::svc(array('key' => 'notary', 'label' => 'Notary', 'fields' => array(self::fld('document_type', 'Document Type', 'text', true), self::fld('number_of_copies', 'Number Of Copies', 'number', true)), 'docs' => array('other'), 'amount' => 149)),
					self::svc(array('key' => 'document_drafting', 'label' => 'Document Drafting', 'fields' => array(self::fld('document_type', 'Document Type', 'text', true), self::fld('key_details', 'Key Details To Include', 'textarea', true)), 'docs' => array(), 'amount' => 399)),
				),
			),

			// ============================================================= COURIER (redirect-only)
			'courier' => array(
				'label' => 'Courier',
				'icon' => 'package',
				'services' => array(
					self::svc(array('key' => 'courier_new_shipment', 'label' => 'New Shipment', 'redirect_hash' => '#new-booking', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_domestic', 'label' => 'Domestic Courier', 'redirect_hash' => '#new-booking', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_international', 'label' => 'International Courier', 'redirect_hash' => '#new-booking', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_reverse_pickup', 'label' => 'Reverse Pickup', 'redirect_hash' => '#reverse-pickup', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_bulk_booking', 'label' => 'Bulk Booking', 'redirect_hash' => '#bulk-booking', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_track', 'label' => 'Track Shipment', 'redirect_hash' => '#track', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_rate_calculator', 'label' => 'Rate Calculator', 'redirect_hash' => '#rate-calculator', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_pickup_history', 'label' => 'Pickup History', 'redirect_hash' => '#pickup-history', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_shipment_history', 'label' => 'Shipment History', 'redirect_hash' => '#shipment-history', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_saved_addresses', 'label' => 'Saved Addresses', 'redirect_hash' => '#addresses', 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'courier_saved_receivers', 'label' => 'Saved Receivers', 'redirect_hash' => '#receivers', 'payment_required' => 0, 'amount' => 0)),
				),
			),

			// ============================================================= GOVERNMENT SCHEMES
			'schemes' => array(
				'label' => 'Government Schemes',
				'icon' => 'landmark',
				'services' => array_merge(
					array(
						self::svc(array('key' => 'ayushman_bharat', 'label' => 'Ayushman Bharat', 'fields' => array(self::fld('family_id_or_ration_card', 'Family ID / Ration Card Number', 'text', true), self::fld('category', 'Category', 'select', true, array('secc' => 'SECC', 'other' => 'Other'))), 'docs' => array('other'), 'amount' => 0, 'payment_required' => 0)),
						self::svc(array('key' => 'pm_kisan', 'label' => 'PM Kisan', 'fields' => array(self::fld('land_records_number', 'Land Records Number', 'text', true), self::fld('bank_details', 'Bank Account Details', 'textarea', true)), 'docs' => array('cheque', 'other'), 'amount' => 0, 'payment_required' => 0)),
						self::svc(array('key' => 'pmegp', 'label' => 'PMEGP', 'fields' => array(self::fld('project_cost_amount', 'Project Cost (Rs.)', 'number', true), self::fld('business_activity', 'Business Activity', 'text', true)), 'docs' => array('pan', 'other'), 'amount' => 199)),
						self::svc(array('key' => 'pm_vishwakarma', 'label' => 'PM Vishwakarma', 'fields' => array(self::fld('trade_category', 'Trade Category', 'text', true), self::fld('aadhaar_linked_mobile', 'Aadhaar-Linked Mobile', 'tel', true)), 'docs' => array('aadhaar'), 'amount' => 0, 'payment_required' => 0)),
						self::svc(array('key' => 'mukhyamantri_yojana', 'label' => 'Mukhyamantri Yojana', 'fields' => array(self::fld('scheme_name_or_state', 'Scheme Name / State', 'text', true), self::fld('eligibility_category', 'Eligibility Category', 'text', true)), 'docs' => array('other'), 'amount' => 0, 'payment_required' => 0)),
						self::svc(array('key' => 'scholarship', 'label' => 'Scholarship', 'fields' => array(self::fld('education_level', 'Education Level', 'select', true, array('school' => 'School', 'ug' => 'Undergraduate', 'pg' => 'Postgraduate')), self::fld('institution_name', 'Institution Name', 'text', true), self::fld('annual_income', 'Annual Family Income (Rs.)', 'number', true)), 'docs' => array('other'), 'amount' => 0, 'payment_required' => 0)),
						self::svc(array('key' => 'pension_services', 'label' => 'Pension Services', 'fields' => array(self::fld('pension_type', 'Pension Type', 'select', true, array('old_age' => 'Old Age', 'widow' => 'Widow', 'disability' => 'Disability')), self::fld('age', 'Age', 'number', true), self::fld('income_certificate_available', 'Income Certificate Available', 'checkbox', false)), 'docs' => array('aadhaar', 'other'), 'amount' => 0, 'payment_required' => 0)),
						self::svc(array('key' => 'labour_card', 'label' => 'Labour Card', 'fields' => array(self::fld('work_category', 'Work Category', 'select', true, array('construction' => 'Construction', 'other' => 'Other')), self::fld('employer_name', 'Employer Name', 'text', false)), 'docs' => array('aadhaar'), 'amount' => 99)),
						self::svc(array('key' => 'eshram_card', 'label' => 'e-Shram Card', 'fields' => array(self::fld('occupation', 'Occupation', 'text', true), self::fld('monthly_income', 'Monthly Income (Rs.)', 'number', true)), 'docs' => array('aadhaar'), 'amount' => 0, 'payment_required' => 0)),
						self::svc(array('key' => 'ration_card', 'label' => 'Ration Card', 'fields' => array(self::fld('card_type', 'Card Type', 'select', true, array('apl' => 'APL', 'bpl' => 'BPL', 'aay' => 'AAY')), self::fld('family_members_count', 'Family Members Count', 'number', true)), 'docs' => array('aadhaar', 'photo'), 'amount' => 99)),
					),
					array(
						self::svc(array('key' => 'birth_certificate', 'label' => 'Birth Certificate', 'fields' => self::tpl_certificate(), 'docs' => array('other'), 'amount' => 149)),
						self::svc(array('key' => 'death_certificate', 'label' => 'Death Certificate', 'fields' => self::tpl_certificate(), 'docs' => array('other'), 'amount' => 149)),
						self::svc(array(
							'key' => 'marriage_certificate', 'label' => 'Marriage Certificate',
							'fields' => array(self::fld('spouse_name', "Spouse's Name", 'text', true), self::fld('marriage_date', 'Marriage Date', 'date', true), self::fld('marriage_place', 'Marriage Place', 'text', true), self::fld('witness_details', 'Witness Details', 'textarea', true)),
							'docs' => array('other'), 'amount' => 199,
						)),
						self::svc(array('key' => 'income_certificate', 'label' => 'Income Certificate', 'fields' => self::tpl_certificate(), 'docs' => array('other'), 'amount' => 99)),
						self::svc(array('key' => 'caste_certificate', 'label' => 'Caste Certificate', 'fields' => self::tpl_certificate(), 'docs' => array('other'), 'amount' => 99)),
						self::svc(array('key' => 'domicile_certificate', 'label' => 'Domicile Certificate', 'fields' => self::tpl_certificate(), 'docs' => array('other'), 'amount' => 99)),
						self::svc(array('key' => 'other_schemes', 'label' => 'Other State/Central Schemes', 'fields' => array(self::fld('scheme_name', 'Scheme Name', 'text', true), self::fld('scheme_details', 'Scheme Details', 'textarea', true)), 'docs' => array('other'), 'amount' => 0, 'payment_required' => 0)),
					)
				),
			),

			// ============================================================= DIGITAL SERVICES
			'digital' => array(
				'label' => 'Digital Services',
				'icon' => 'laptop',
				'services' => array(
					self::svc(array('key' => 'digilocker', 'label' => 'DigiLocker', 'fields' => array(self::fld('linking_method', 'Linking Method', 'select', true, array('aadhaar' => 'Aadhaar', 'mobile' => 'Mobile Number'))), 'docs' => array(), 'payment_required' => 0, 'amount' => 0)),
					self::svc(array('key' => 'esign', 'label' => 'eSign', 'fields' => array(self::fld('signing_purpose', 'Signing Purpose', 'text', true)), 'docs' => array('other'), 'amount' => 49)),
					self::svc(array('key' => 'document_verification', 'label' => 'Document Verification', 'fields' => array(self::fld('document_type', 'Document Type', 'text', true), self::fld('reference_number', 'Reference Number', 'text', false)), 'docs' => array('other'), 'amount' => 49)),
					self::svc(array('key' => 'document_scanner', 'label' => 'Document Scanner', 'fields' => array(self::fld('number_of_pages', 'Number Of Pages', 'number', true), self::fld('document_description', 'Document Description', 'text', false)), 'docs' => array(), 'amount' => 0, 'payment_required' => 0)),
					self::svc(array('key' => 'ocr_services', 'label' => 'OCR Services', 'fields' => array(self::fld('document_type', 'Document Type', 'text', true), self::fld('output_format', 'Output Format', 'select', true, array('text' => 'Text', 'excel' => 'Excel'))), 'docs' => array('other'), 'amount' => 0, 'payment_required' => 0)),
					self::svc(array('key' => 'digital_vault', 'label' => 'Digital Vault', 'fields' => array(self::fld('vault_purpose', 'Purpose', 'text', false), self::fld('storage_duration_preference', 'Storage Duration Preference', 'select', false, array('1y' => '1 Year', '5y' => '5 Years', 'lifetime' => 'Lifetime'))), 'docs' => array(), 'amount' => 0, 'payment_required' => 0)),
				),
			),
		);
	}

	protected static function loan_services()
	{
		$types = array(
			'loan_personal' => 'Personal Loan', 'loan_business' => 'Business Loan', 'loan_home' => 'Home Loan',
			'loan_vehicle' => 'Vehicle Loan', 'loan_education' => 'Education Loan', 'loan_gold' => 'Gold Loan',
		);
		$out = array();
		foreach ($types as $key => $label) {
			$out[] = self::svc(array('key' => $key, 'label' => $label, 'fields' => self::tpl_loan(), 'docs' => array('pan', 'aadhaar', 'photo'), 'amount' => 0, 'payment_required' => 0));
		}
		return $out;
	}

	protected static function insurance_services()
	{
		$types = array(
			'insurance_life' => 'Life Insurance', 'insurance_health' => 'Health Insurance',
			'insurance_vehicle' => 'Vehicle Insurance', 'insurance_term' => 'Term Insurance',
		);
		$out = array();
		foreach ($types as $key => $label) {
			$out[] = self::svc(array('key' => $key, 'label' => $label, 'fields' => self::tpl_insurance(), 'docs' => array('aadhaar', 'photo'), 'amount' => 0, 'payment_required' => 0));
		}
		return $out;
	}
}
