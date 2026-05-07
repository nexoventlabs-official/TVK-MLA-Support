/**
 * Catalog of TVK grievance services and their sub-options.
 *
 * Each service has:
 *   id           — stable id used in flow + DB (snake_case)
 *   title        — human-readable label shown in WhatsApp flow
 *   description  — secondary text under the title
 *   iconKey      — FlowImage key (admin uploads the icon under this key)
 *   options[]    — sub-options shown after a service is picked
 */

const SERVICES = [
  {
    id: 'civic_works',
    title: 'Civic Works',
    description: 'Roads, lights, drainage, garbage',
    iconKey: 'icon_civic_works',
    bannerKey: 'banner_civic_works',
    options: [
      { id: 'road_repair',   title: 'Road Repair',   description: 'Potholes / damaged road', iconKey: 'icon_civic_road_repair' },
      { id: 'street_light',  title: 'Street Light',  description: 'Light not working',       iconKey: 'icon_civic_street_light' },
      { id: 'drainage',      title: 'Drainage',      description: 'Blocked / overflow',      iconKey: 'icon_civic_drainage' },
      { id: 'power_issue',   title: 'Power Issue',   description: 'Outage / fluctuation',    iconKey: 'icon_civic_power' },
      { id: 'garbage_issue', title: 'Garbage Issue', description: 'Waste not collected',     iconKey: 'icon_civic_garbage' },
    ],
  },
  {
    id: 'revenue',
    title: 'Revenue',
    description: 'Certificates, patta, relief',
    iconKey: 'icon_revenue',
    bannerKey: 'banner_revenue',
    options: [
      { id: 'income_certificate', title: 'Income Certificate Issue', description: 'Apply / pending', iconKey: 'icon_rev_income' },
      { id: 'patta_issue',        title: 'Patta Issue',              description: 'Land patta',      iconKey: 'icon_rev_patta' },
      { id: 'disaster_relief',    title: 'Disaster Relief',          description: 'Relief request',  iconKey: 'icon_rev_disaster' },
      { id: 'death_birth_certificate', title: 'Death / Birth Certificate', description: 'Issue / correction', iconKey: 'icon_rev_certificate' },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    description: 'PHC, vaccination, ambulance',
    iconKey: 'icon_health',
    bannerKey: 'banner_health',
    options: [
      { id: 'new_phc',                 title: 'New PHC',                 description: 'Request a new PHC',           iconKey: 'icon_health_phc' },
      { id: 'vaccination_camp',        title: 'Vaccination Camp Request', description: 'Request a camp',              iconKey: 'icon_health_vaccine' },
      { id: 'ambulance_not_responding', title: 'Ambulance Not Responding', description: 'Emergency response issue', iconKey: 'icon_health_ambulance' },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Schools, mid-day meals, sports',
    iconKey: 'icon_education',
    bannerKey: 'banner_education',
    options: [
      { id: 'school_building_disrepair',  title: 'School Building in Disrepair', description: 'Building issue', iconKey: 'icon_edu_building' },
      { id: 'mid_day_meal_issue',         title: 'Mid-day Meal Issue',           description: 'Quality / supply', iconKey: 'icon_edu_meal' },
      { id: 'sports_infra_request',       title: 'Sports Infrastructure Request', description: 'Equipment / ground', iconKey: 'icon_edu_sports' },
    ],
  },
  {
    id: 'ration',
    title: 'Ration',
    description: 'Ration card, pension, FPS',
    iconKey: 'icon_ration',
    bannerKey: 'banner_ration',
    options: [
      { id: 'new_ration_card',         title: 'New Ration Card',          description: 'Apply for new card',     iconKey: 'icon_rat_new_card' },
      { id: 'pension_not_received',    title: 'Pension Not Received',     description: 'Missing pension',         iconKey: 'icon_rat_pension' },
      { id: 'rice_not_at_fps',         title: 'Rice Not at FPS',          description: 'Stock issue at FPS',      iconKey: 'icon_rat_rice' },
      { id: 'update_card',             title: 'Update Card',              description: 'Add / remove member',     iconKey: 'icon_rat_update' },
      { id: 'sc_st_welfare_not_received', title: 'SC/ST Welfare Not Received', description: 'Welfare issue',     iconKey: 'icon_rat_welfare' },
      { id: 'anganwadi_issue',         title: 'Anganwadi Issue',          description: 'Anganwadi service',       iconKey: 'icon_rat_anganwadi' },
    ],
  },
  {
    id: 'agriculture',
    title: 'Agriculture',
    description: 'Insurance, loans, subsidies',
    iconKey: 'icon_agriculture',
    bannerKey: 'banner_agriculture',
    options: [
      { id: 'crop_insurance_claim',     title: 'Crop Insurance Claim',     description: 'Claim status',         iconKey: 'icon_agri_insurance' },
      { id: 'kissan_loan_issue',        title: 'Kissan Loan Issue',        description: 'Loan issue',           iconKey: 'icon_agri_loan' },
      { id: 'seeds_fertilizers_subsidy', title: 'Seeds / Fertilizers Subsidy', description: 'Subsidy issue', iconKey: 'icon_agri_seeds' },
      { id: 'equipment_subsidy',        title: 'Equipment Subsidy',        description: 'Equipment subsidy',    iconKey: 'icon_agri_equipment' },
      { id: 'fisherman_welfare',        title: 'Fisherman Welfare',        description: 'Welfare scheme',       iconKey: 'icon_agri_fisherman' },
      { id: 'flood_compensation',       title: 'Flood Compensation',       description: 'Compensation request', iconKey: 'icon_agri_flood' },
    ],
  },
  {
    id: 'law_order',
    title: 'Law & Order',
    description: 'FIR, legal aid, safety',
    iconKey: 'icon_law_order',
    bannerKey: 'banner_law_order',
    options: [
      { id: 'fir_not_filed',     title: 'FIR Not Filed',     description: 'Police did not file FIR', iconKey: 'icon_law_fir' },
      { id: 'legal_aid_request', title: 'Legal Aid Request', description: 'Free legal aid',          iconKey: 'icon_law_aid' },
      { id: 'eve_teasing',       title: 'Eve-Teasing',       description: 'Harassment complaint',     iconKey: 'icon_law_eve' },
      { id: 'illegal_dump',      title: 'Illegal Dump',      description: 'Illegal dumping',          iconKey: 'icon_law_dump' },
    ],
  },
  {
    id: 'employment',
    title: 'Employment',
    description: 'Skills, EPF, MSME',
    iconKey: 'icon_employment',
    bannerKey: 'banner_employment',
    options: [
      { id: 'job',             title: 'Job',             description: 'Job opportunities / placement', iconKey: 'icon_emp_job' },
      { id: 'skill_training',  title: 'Skill Training',  description: 'Training programs',  iconKey: 'icon_emp_skill' },
      { id: 'self_employment', title: 'Self Employment', description: 'Self-employment scheme', iconKey: 'icon_emp_self' },
      { id: 'epf_issue',       title: 'EPF Issue',       description: 'Provident fund issue', iconKey: 'icon_emp_epf' },
      { id: 'msme_loan',       title: 'MSME Loan',       description: 'MSME loan support',    iconKey: 'icon_emp_msme' },
    ],
  },
  {
    id: 'personal_assistance',
    title: 'Personal Assistance',
    description: 'Old age, marriage, disputes',
    iconKey: 'icon_personal_assistance',
    bannerKey: 'banner_personal_assistance',
    options: [
      { id: 'old_age_care',                title: 'Old Age Care',                description: 'Senior citizen care',  iconKey: 'icon_pa_oldage' },
      { id: 'marriage_assistance_scheme',  title: 'Marriage Assistance Scheme',  description: 'Marriage scheme',      iconKey: 'icon_pa_marriage' },
      { id: 'fire_accident_relief',        title: 'Fire Accident Relief',        description: 'Relief after fire',    iconKey: 'icon_pa_fire' },
      { id: 'recommendation_letter',       title: 'Recommendation Letter',       description: 'Request letter',       iconKey: 'icon_pa_letter' },
      { id: 'property_dispute_mediation',  title: 'Property Dispute Mediation',  description: 'Mediation request',    iconKey: 'icon_pa_property' },
    ],
  },
];

function getServiceById(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

function getOption(serviceId, optionId) {
  const s = getServiceById(serviceId);
  if (!s) return null;
  return s.options.find((o) => o.id === optionId) || null;
}

/** Flatten icon + banner keys for FlowImage seeding. */
function allImageKeys() {
  const keys = [
    { key: 'flow_welcome_banner', label: 'Welcome Flow Banner (top of service screen)', group: 'banners' },
    { key: 'chat_welcome_header', label: 'Chatbot welcome-message header image', group: 'chatbot' },
  ];
  for (const s of SERVICES) {
    keys.push({ key: s.iconKey, label: `Service icon: ${s.title}`, group: 'service_icons' });
    keys.push({ key: s.bannerKey, label: `Banner — ${s.title} screen`, group: 'sub_banners' });
    for (const o of s.options) {
      keys.push({
        key: o.iconKey,
        label: `${s.title} option icon: ${o.title}`,
        group: `options_${s.id}`,
      });
    }
  }
  return keys;
}

module.exports = { SERVICES, getServiceById, getOption, allImageKeys };
