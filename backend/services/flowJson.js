/**
 * Builds the Endpoint-mode Flow JSON for the TVK grievance welcome flow.
 *
 * Single flow, multiple screens. Backend `INIT` returns the Service-Select screen.
 * Each `data_exchange` returns the next screen with dynamic content (icons, banners,
 * sub-options) embedded as base64.
 *
 * Screens
 *  ─ SERVICE_SELECT   banner + 9 services radio list
 *  ─ OPTION_SELECT    banner + dynamic options for the selected service
 *  ─ DETAILS          form: description (+ optional location)
 *  ─ INFO             terminal "thank you" screen
 */

function buildFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      SERVICE_SELECT: ['OPTION_SELECT', 'INFO'],
      OPTION_SELECT: ['DETAILS', 'INFO'],
      DETAILS: ['INFO'],
      INFO: [],
    },
    screens: [
      // ─── SERVICE_SELECT ───
      {
        id: 'SERVICE_SELECT',
        title: 'Choose Service',
        data: {
          welcome_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_welcome_banner: { type: 'boolean', __example__: true },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'civic_works', title: 'Civic Works', description: 'Roads, lights, drainage' },
              { id: 'revenue', title: 'Revenue', description: 'Certificates, patta' },
            ],
          },
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
              'alt-text': 'Welcome to TVK',
              visible: '${data.has_welcome_banner}',
            },
            { type: 'TextBody', text: 'Welcome to TVK Grievance Service 🇮🇳' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_service',
              label: 'Select a service',
              required: true,
              'data-source': '${data.services}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: { selected_service: '${form.selected_service}' },
              },
            },
          ],
        },
      },

      // ─── OPTION_SELECT ───
      {
        id: 'OPTION_SELECT',
        title: 'Choose Issue',
        data: {
          option_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_option_banner: { type: 'boolean', __example__: false },
          service_id: { type: 'string', __example__: 'civic_works' },
          service_title: { type: 'string', __example__: 'Civic Works' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'road_repair', title: 'Road Repair', description: 'Potholes / damaged road' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.option_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Service Banner',
              visible: '${data.has_option_banner}',
            },
            { type: 'TextHeading', text: '${data.service_title}' },
            { type: 'TextBody', text: 'Choose the issue you want to raise:' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_option',
              label: 'Issues',
              required: true,
              'data-source': '${data.options}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'option_pick',
                  service_id: '${data.service_id}',
                  selected_option: '${form.selected_option}',
                },
              },
            },
          ],
        },
      },

      // ─── DETAILS ───
      {
        id: 'DETAILS',
        title: 'Details',
        data: {
          service_id: { type: 'string', __example__: 'civic_works' },
          option_id: { type: 'string', __example__: 'road_repair' },
          service_title: { type: 'string', __example__: 'Civic Works' },
          option_title: { type: 'string', __example__: 'Road Repair' },
          init_phone: { type: 'string', __example__: '919999999999' },
          init_name: { type: 'string', __example__: '' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.option_title}' },
            { type: 'TextSubheading', text: '${data.service_title}' },
            { type: 'TextBody', text: 'Share a few details so our team can help you faster.' },
            {
              type: 'TextInput',
              name: 'name',
              label: 'Your Name',
              required: true,
              'input-type': 'text',
              'init-value': '${data.init_name}',
            },
            {
              type: 'TextInput',
              name: 'mobile',
              label: 'WhatsApp Number',
              required: true,
              'input-type': 'phone',
              enabled: false,
              'init-value': '${data.init_phone}',
            },
            {
              type: 'TextInput',
              name: 'location',
              label: 'Location / Address',
              required: false,
              'input-type': 'text',
              'helper-text': 'Village / town / district',
            },
            {
              type: 'TextArea',
              name: 'description',
              label: 'Describe the issue',
              required: true,
              'helper-text': 'Tell us what is happening and how we can help.',
            },
            {
              type: 'Footer',
              label: 'Submit',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'submit_request',
                  service_id: '${data.service_id}',
                  option_id: '${data.option_id}',
                  name: '${form.name}',
                  mobile: '${data.init_phone}',
                  location: '${form.location}',
                  description: '${form.description}',
                },
              },
            },
          ],
        },
      },

      // ─── INFO (terminal) ───
      {
        id: 'INFO',
        title: 'Thank you',
        terminal: true,
        success: true,
        data: {
          info_title: { type: 'string', __example__: 'Thank you' },
          info_body: { type: 'string', __example__: 'We will get back to you soon.' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.info_title}' },
            { type: 'TextBody', text: '${data.info_body}' },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'complete',
                payload: {},
              },
            },
          ],
        },
      },
    ],
  };
}

module.exports = { buildFlowJSON };
