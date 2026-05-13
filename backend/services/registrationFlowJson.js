/**
 * Endpoint-mode Flow JSON for the TVK Voter Registration flow.
 *
 * Sent to a WhatsApp user the first time they message the bot, before they
 * can access the grievance flow. Reuses the same banner image key as the
 * grievance flow so admins manage one image.
 *
 * Screens
 *  ─ REG_START    EPIC + DOB inputs, "Don't have EPIC?" link → REG_MANUAL
 *  ─ REG_CONFIRM  shows voter details fetched from the read-only voter DB
 *  ─ REG_MANUAL   manual form (name, email, dob, gender) when no EPIC
 *  ─ REG_DONE     terminal "thank you" screen
 */

function buildRegistrationFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      REG_START: ['REG_CONFIRM', 'REG_MANUAL', 'REG_DONE'],
      REG_CONFIRM: ['REG_DONE'],
      REG_MANUAL: ['REG_DONE'],
      REG_DONE: [],
    },
    screens: [
      // ─── REG_START ───
      {
        id: 'REG_START',
        title: 'Register',
        data: {
          welcome_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_welcome_banner: { type: 'boolean', __example__: true },
          error_text: { type: 'string', __example__: '' },
          has_error: { type: 'boolean', __example__: false },
          init_phone: { type: 'string', __example__: '919999999999' },
          init_name: { type: 'string', __example__: '' },
          init_epic: { type: 'string', __example__: '' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.welcome_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'TVK Mylapore Grievance',
              visible: '${data.has_welcome_banner}',
            },
            { type: 'TextHeading', text: 'Voter Registration' },
            {
              type: 'TextBody',
              text:
                'Vanakkam 🙏\n\nPlease register once to access TVK Mylapore Legislative Assembly Grievance Service. Enter your EPIC (Voter ID) number and Date of Birth below.',
            },
            {
              type: 'TextBody',
              text: '⚠️ ${data.error_text}',
              visible: '${data.has_error}',
            },
            {
              type: 'TextInput',
              name: 'epic_no',
              label: 'EPIC Number',
              required: true,
              'helper-text': 'e.g. RJE0667071',
              'input-type': 'text',
              'init-value': '${data.init_epic}',
            },
            {
              type: 'DatePicker',
              name: 'dob',
              label: 'Date of Birth',
              required: true,
              'helper-text': 'DD / MM / YYYY',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'lookup_epic',
                  epic_no: '${form.epic_no}',
                  dob: '${form.dob}',
                },
              },
            },
            {
              type: 'EmbeddedLink',
              text: "Don't have EPIC? Register Manually",
              'on-click-action': {
                name: 'navigate',
                next: { type: 'screen', name: 'REG_MANUAL' },
                payload: {
                  welcome_banner: '${data.welcome_banner}',
                  has_welcome_banner: '${data.has_welcome_banner}',
                  init_phone: '${data.init_phone}',
                  init_name: '${data.init_name}',
                  init_email: '',
                  error_text: '',
                  has_error: false,
                },
              },
            },
          ],
        },
      },

      // ─── REG_CONFIRM ───
      // Voter record returned by the EPIC lookup. Rendered as a markdown
      // table via WhatsApp Flow's RichText component so the screen reads
      // like a receipt — no banner image, no decorative chrome, just the
      // facts the user is being asked to confirm.
      //
      // IMPORTANT: RichText only resolves a single whole-string ${data.x}
      // binding — embedded references like `${data.voter_name}` inside the
      // markdown body are NOT substituted and would render literally. So
      // the entire confirmation markdown (heading + intro + filled table)
      // is built on the server in flowEndpoint.js and shipped as one
      // `confirm_md` string.
      {
        id: 'REG_CONFIRM',
        title: 'Confirm',
        data: {
          confirm_md: {
            type: 'string',
            __example__:
              '# Confirm Your Details\n\nWe found the following voter record. Please confirm to complete registration.\n\n| **Field** | **Value** |\n| :--- | :--- |\n| Name | **Chitra** |\n| EPIC Number | RJE0667071 |\n| Husband | Mohan |\n| Gender | Female |\n| Date of Birth | 15-05-1990 |\n| House No | 1 |\n| Assembly | Mylapore (25) |',
          },
        },
        layout: {
          // Meta requires RichText to be paired only with Footer on the same
          // screen — so this screen has exactly two children.
          type: 'SingleColumnLayout',
          children: [
            { type: 'RichText', text: '${data.confirm_md}' },
            {
              type: 'Footer',
              label: 'Confirm & Register',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'save_epic' },
              },
            },
          ],
        },
      },

      // ─── REG_MANUAL ───
      {
        id: 'REG_MANUAL',
        title: 'Register',
        data: {
          welcome_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_welcome_banner: { type: 'boolean', __example__: true },
          init_phone: { type: 'string', __example__: '919999999999' },
          init_name: { type: 'string', __example__: '' },
          init_email: { type: 'string', __example__: '' },
          error_text: { type: 'string', __example__: '' },
          has_error: { type: 'boolean', __example__: false },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.welcome_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'TVK Mylapore Grievance',
              visible: '${data.has_welcome_banner}',
            },
            { type: 'TextHeading', text: 'Register Manually' },
            {
              type: 'TextBody',
              text:
                'Fill in your details below. Your WhatsApp number is used as your registered mobile.',
            },
            {
              type: 'TextBody',
              text: '⚠️ ${data.error_text}',
              visible: '${data.has_error}',
            },
            {
              type: 'TextInput',
              name: 'name',
              label: 'Full Name',
              required: true,
              'input-type': 'text',
              'init-value': '${data.init_name}',
            },
            {
              type: 'TextInput',
              name: 'mobile',
              label: 'WhatsApp Number',
              required: false,
              'input-type': 'phone',
              enabled: false,
              'init-value': '${data.init_phone}',
            },
            {
              type: 'TextInput',
              name: 'email',
              label: 'Email',
              required: false,
              'input-type': 'email',
              'init-value': '${data.init_email}',
            },
            {
              type: 'DatePicker',
              name: 'dob',
              label: 'Date of Birth',
              required: true,
            },
            {
              type: 'Dropdown',
              name: 'gender',
              label: 'Gender',
              required: true,
              'data-source': [
                { id: 'Male', title: 'Male' },
                { id: 'Female', title: 'Female' },
                { id: 'Other', title: 'Other' },
              ],
            },
            {
              type: 'Footer',
              label: 'Register',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'save_manual',
                  name: '${form.name}',
                  email: '${form.email}',
                  dob: '${form.dob}',
                  gender: '${form.gender}',
                },
              },
            },
          ],
        },
      },

      // ─── REG_DONE (terminal) ───
      {
        id: 'REG_DONE',
        title: 'Done',
        terminal: true,
        success: true,
        data: {
          info_title: { type: 'string', __example__: '🙏 Registered' },
          info_body: { type: 'string', __example__: 'You are now registered.' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.info_title}' },
            { type: 'TextBody', text: '${data.info_body}' },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': { name: 'complete', payload: {} },
            },
          ],
        },
      },
    ],
  };
}

module.exports = { buildRegistrationFlowJSON };
