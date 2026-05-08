/**
 * Single source of truth: what does each (service, option) terminal-action
 * look like? Every option in `serviceCatalog.js` has exactly one entry here.
 *
 * Action kinds
 *  ─ 'url'                    Close flow → send image header + body + URL CTA. No ticket created.
 *  ─ 'pdf'                    Close flow → send PDF document + body + 'Choose Service' CTA. No ticket.
 *  ─ 'ticket'                 (Used after the existing DETAILS form submit.) Create ticket,
 *                             send confirmation message with image header + ticket id +
 *                             'Choose Service' CTA. No URL.
 *  ─ 'details_then_url'       After DETAILS submit, also send image header + body + URL CTA.
 *                             Ticket IS still created so admin can track.
 *  ─ 'location_photos_ticket' Close flow → ask user to share location → ask for photos →
 *                             create ticket → send confirmation message with image header +
 *                             ticket id + 'Choose Service' CTA. (No DETAILS form.)
 *  ─ 'location_only_ticket'   Same as above but skip the photos step.
 *
 * Optional fields
 *  ─ url           Used by 'url' and 'details_then_url'.
 *  ─ pdfKey        FlowImage key holding the PDF Cloudinary URL ('pdf' kind).
 *  ─ headerKey     FlowImage key for the confirmation/CTA image header. If omitted,
 *                  falls back to `chat_welcome_header`.
 *  ─ ctaLabel      Label for the URL CTA button. Defaults to 'Open Link'.
 *  ─ minPhotos     For location_photos_ticket — defaults to 1.
 */

const ACTIONS = {
  // ─── Civic Works ─────────────────────────────────────────────────────────
  'civic_works.road_repair':   { kind: 'location_photos_ticket', headerKey: 'header_civic_road_repair', minPhotos: 1 },
  'civic_works.street_light':  { kind: 'location_photos_ticket', headerKey: 'header_civic_street_light', minPhotos: 1 },
  'civic_works.drainage':      { kind: 'location_photos_ticket', headerKey: 'header_civic_drainage', minPhotos: 1 },
  'civic_works.power_issue':   { kind: 'location_only_ticket',   headerKey: 'header_civic_power' },
  'civic_works.garbage_issue': { kind: 'location_photos_ticket', headerKey: 'header_civic_garbage', minPhotos: 1 },

  // ─── Revenue ─────────────────────────────────────────────────────────────
  'revenue.income_certificate':       { kind: 'url', headerKey: 'header_rev_income',       url: 'https://tnedistrict.tn.gov.in/tneda/VerifyCerti.xhtml', ctaLabel: 'Apply' },
  'revenue.patta_issue':              { kind: 'url', headerKey: 'header_rev_patta',        url: 'https://eservices.tn.gov.in/eservicesnew/index.html',  ctaLabel: 'Open Portal' },
  'revenue.disaster_relief':          { kind: 'url', headerKey: 'header_rev_disaster',     url: 'https://en.wikipedia.org/wiki/Tamil_Nadu_State_Disaster_Management_Authority', ctaLabel: 'Learn More' },
  'revenue.death_birth_certificate':  { kind: 'url', headerKey: 'header_rev_certificate',  url: 'https://www.crstn.org/birth_death_tn/', ctaLabel: 'Apply' },

  // ─── Health ──────────────────────────────────────────────────────────────
  'health.new_phc':                  { kind: 'details_then_url', headerKey: 'header_health_phc',       url: 'https://tnhealth.tn.gov.in/',                ctaLabel: 'Open Portal' },
  'health.vaccination_camp':         { kind: 'details_then_url', headerKey: 'header_health_vaccine',   url: 'https://tnhealth.tn.gov.in/tngovin/dph/dphpm.php', ctaLabel: 'Open Portal' },
  'health.ambulance_not_responding': { kind: 'details_then_url', headerKey: 'header_health_ambulance', url: 'https://tnhsp.org/',                          ctaLabel: 'TNHSP' },

  // ─── Education ───────────────────────────────────────────────────────────
  'education.school_building_disrepair': { kind: 'location_photos_ticket', headerKey: 'header_edu_building', minPhotos: 1 },
  'education.mid_day_meal_issue':        { kind: 'ticket',                 headerKey: 'header_edu_meal' },
  'education.sports_infra_request':      { kind: 'ticket',                 headerKey: 'header_edu_sports' },

  // ─── Ration ──────────────────────────────────────────────────────────────
  'ration.new_ration_card':           { kind: 'url',              headerKey: 'header_rat_new_card',  url: 'https://www.tnpds.gov.in/',                            ctaLabel: 'TNPDS' },
  'ration.pension_not_received':      { kind: 'details_then_url', headerKey: 'header_rat_pension',   url: 'https://www.tn.gov.in/karuvoolam/pension.htm',         ctaLabel: 'Pension Info' },
  'ration.rice_not_at_fps':           { kind: 'ticket',           headerKey: 'header_rat_rice' },
  'ration.update_card':               { kind: 'url',              headerKey: 'header_rat_update',    url: 'https://www.tnpds.gov.in/',                            ctaLabel: 'TNPDS' },
  'ration.sc_st_welfare_not_received':{ kind: 'details_then_url', headerKey: 'header_rat_welfare',   url: 'https://www.tnadw.tn.gov.in/',                         ctaLabel: 'TNADW' },
  'ration.anganwadi_issue':           { kind: 'details_then_url', headerKey: 'header_rat_anganwadi', url: 'https://www.tn.gov.in/go.php?dep_id=MzA=&year=MjAxNQ==', ctaLabel: 'Open Portal' },

  // ─── Agriculture ─────────────────────────────────────────────────────────
  'agriculture.crop_insurance_claim':     { kind: 'url', headerKey: 'header_agri_insurance', url: 'https://pmfby.gov.in/',                              ctaLabel: 'PMFBY' },
  'agriculture.kissan_loan_issue':        { kind: 'url', headerKey: 'header_agri_loan',      url: 'https://rcs.tn.gov.in/rcsweb/kcc-loan/form',         ctaLabel: 'KCC Loan' },
  'agriculture.seeds_fertilizers_subsidy':{ kind: 'pdf', headerKey: 'header_agri_seeds',     pdfKey: 'pdf_seeds_subsidy' },
  'agriculture.equipment_subsidy':        { kind: 'url', headerKey: 'header_agri_equipment', url: 'https://rcs.tn.gov.in/rcsweb/kcc-loan/form',         ctaLabel: 'Apply' },
  'agriculture.fisherman_welfare':        { kind: 'url', headerKey: 'header_agri_fisherman', url: 'https://www.fisheries.tn.gov.in/WelfareBoard.html',  ctaLabel: 'Welfare Board' },
  'agriculture.flood_compensation':       { kind: 'pdf', headerKey: 'header_agri_flood',     pdfKey: 'pdf_flood_compensation' },

  // ─── Law & Order ─────────────────────────────────────────────────────────
  'law_order.fir_not_filed':     { kind: 'ticket',                 headerKey: 'header_law_fir' },
  'law_order.legal_aid_request': { kind: 'ticket',                 headerKey: 'header_law_aid' },
  'law_order.eve_teasing':       { kind: 'ticket',                 headerKey: 'header_law_eve' },
  'law_order.illegal_dump':      { kind: 'location_photos_ticket', headerKey: 'header_law_dump', minPhotos: 1 },

  // ─── Employment ──────────────────────────────────────────────────────────
  'employment.job':             { kind: 'url', headerKey: 'header_emp_job',   url: 'https://tamilnadurecruitment.in/',                                              ctaLabel: 'View Jobs' },
  'employment.skill_training':  { kind: 'url', headerKey: 'header_emp_skill', url: 'https://www.tnskill.tn.gov.in/',                                                ctaLabel: 'TN Skill' },
  'employment.self_employment': { kind: 'url', headerKey: 'header_emp_self',  url: 'https://www.tnwidowwelfareboard.tn.gov.in/self-employment-registration-form.html', ctaLabel: 'Register' },
  'employment.epf_issue':       { kind: 'url', headerKey: 'header_emp_epf',   url: 'https://www.epfindia.gov.in/site_en/',                                          ctaLabel: 'EPF Portal' },
  'employment.msme_loan':       { kind: 'url', headerKey: 'header_emp_msme',  url: 'https://msmeonline.tn.gov.in/',                                                  ctaLabel: 'MSME' },

  // ─── Personal Assistance ─────────────────────────────────────────────────
  'personal_assistance.old_age_care':               { kind: 'url',                   headerKey: 'header_pa_oldage',   url: 'https://www.tnsocialwelfare.tn.gov.in/', ctaLabel: 'Welfare' },
  'personal_assistance.marriage_assistance_scheme': { kind: 'url',                   headerKey: 'header_pa_marriage', url: 'https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/marriage-assistance-schemes', ctaLabel: 'Schemes' },
  'personal_assistance.fire_accident_relief':       { kind: 'location_photos_ticket', headerKey: 'header_pa_fire', minPhotos: 1 },
  'personal_assistance.recommendation_letter':      { kind: 'ticket',                 headerKey: 'header_pa_letter' },
  'personal_assistance.property_dispute_mediation': { kind: 'ticket',                 headerKey: 'header_pa_property' },
};

/** Look up the action for a (serviceId, optionId) pair. Returns null if unknown. */
function getAction(serviceId, optionId) {
  if (!serviceId || !optionId) return null;
  return ACTIONS[`${serviceId}.${optionId}`] || null;
}

/** True iff the option needs the existing DETAILS form before its terminal action. */
function needsDetailsForm(action) {
  if (!action) return false;
  return ['ticket', 'details_then_url'].includes(action.kind);
}

/** True iff the option's terminal action runs only after the WhatsApp flow has CLOSED
 *  (i.e. webhook state-machine territory). */
function runsAfterFlowClose(action) {
  if (!action) return false;
  return ['url', 'pdf', 'location_photos_ticket', 'location_only_ticket'].includes(action.kind);
}

/** Every header_* / pdf_* FlowImage key referenced by the action map.
 *  Used by serviceCatalog.allImageKeys() to seed the FlowImage collection. */
function allActionImageKeys() {
  const keys = new Set();
  for (const a of Object.values(ACTIONS)) {
    if (a.headerKey) keys.add(a.headerKey);
    if (a.pdfKey) keys.add(a.pdfKey);
  }
  return [...keys];
}

module.exports = {
  ACTIONS,
  getAction,
  needsDetailsForm,
  runsAfterFlowClose,
  allActionImageKeys,
};
