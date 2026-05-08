/**
 * Endpoint-mode Flow JSON for the TVK grievance welcome flow (single flow,
 * many screens, all driven by /api/flow-endpoint data_exchange callbacks).
 *
 * The first screen ("INIT") is now MAIN_MENU. Existing SERVICE_SELECT /
 * OPTION_SELECT / DETAILS / INFO screens are reachable from MAIN_MENU and
 * keep their old behaviour so the existing per-issue Raise-Issue branch
 * keeps working unchanged.
 *
 * Screens
 *  ─ MAIN_MENU           6 tiles: Your Requests · Events · Raise Issue ·
 *                                  Contact MLA · Social Media · Helplines
 *  ─ MY_REQUESTS         User's ticketed requests (radio list)
 *  ─ MY_REQUEST_DETAIL   Status + description for one ticket
 *  ─ EVENTS              Upcoming events (radio list)
 *  ─ EVENT_DETAILS       One event's image + dates + description
 *  ─ SERVICE_SELECT      Existing: 9 services
 *  ─ OPTION_SELECT       Existing: dynamic sub-issues
 *  ─ DETAILS             Existing: name + location + description + schoolName
 *  ─ INFO                Generalised terminal screen. Carries `post_action`
 *                        + `post_data_b64` (a base64-JSON blob the webhook
 *                        decodes after `complete`) so we can dispatch URL /
 *                        PDF / location-photo / ticket flows from a single
 *                        screen.
 */

function buildFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      MAIN_MENU: ['MY_REQUESTS', 'EVENTS', 'SERVICE_SELECT', 'SOCIAL_SELECT', 'INFO'],
      MY_REQUESTS: ['MY_REQUEST_DETAIL', 'INFO'],
      MY_REQUEST_DETAIL: ['INFO'],
      EVENTS: ['EVENT_DETAILS', 'INFO'],
      EVENT_DETAILS: ['INFO'],
      SOCIAL_SELECT: [],
      SERVICE_SELECT: ['OPTION_SELECT', 'INFO'],
      OPTION_SELECT: ['DETAILS', 'INFO'],
      DETAILS: ['INFO'],
      INFO: [],
    },
    screens: [
      // ─── MAIN_MENU ────────────────────────────────────────────────────
      {
        id: 'MAIN_MENU',
        title: 'TVK Grievance',
        data: {
          welcome_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_welcome_banner: { type: 'boolean', __example__: false },
          main_options: {
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
              { id: 'my_requests', title: 'Your Requests', description: 'Track your tickets' },
              { id: 'events', title: 'Upcoming Events', description: 'Public events' },
              { id: 'raise_issue', title: 'Raise Issue', description: '9 service categories' },
              { id: 'contact_mla', title: 'Contact MLA Office', description: 'Speak to us' },
              { id: 'social_media', title: 'Social Media', description: 'Follow us' },
              { id: 'helplines', title: 'Helplines', description: 'Emergency numbers' },
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
            { type: 'TextBody', text: 'Welcome to TVK 🇮🇳\nWhat would you like to do?' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_main',
              label: 'Choose an option',
              required: true,
              'data-source': '${data.main_options}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: { selected_main: '${form.selected_main}' },
              },
            },
          ],
        },
      },

      // ─── MY_REQUESTS ──────────────────────────────────────────────────
      {
        id: 'MY_REQUESTS',
        title: 'Your Requests',
        data: {
          requests: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
              },
            },
            __example__: [{ id: 'TVK-2605-0001', title: 'TVK-2605-0001 · Pending', description: 'Road Repair · 7 May' }],
          },
          empty_text: { type: 'string', __example__: '' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Your Requests' },
            { type: 'TextBody', text: '${data.empty_text}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_request',
              label: 'Tickets',
              required: true,
              'data-source': '${data.requests}',
            },
            {
              type: 'Footer',
              label: 'View Details',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'view_request', selected_request: '${form.selected_request}' },
              },
            },
          ],
        },
      },

      // ─── MY_REQUEST_DETAIL ────────────────────────────────────────────
      {
        id: 'MY_REQUEST_DETAIL',
        title: 'Request Details',
        data: {
          ticket_id: { type: 'string', __example__: 'TVK-2605-0001' },
          ticket_status: { type: 'string', __example__: 'Pending' },
          ticket_meta: { type: 'string', __example__: 'Road Repair · 7 May 2026' },
          ticket_description: { type: 'string', __example__: 'Pothole near Anna Salai' },
          ticket_notes: { type: 'string', __example__: '' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.ticket_id}' },
            { type: 'TextSubheading', text: '${data.ticket_status}' },
            { type: 'TextCaption', text: '${data.ticket_meta}' },
            { type: 'TextBody', text: '${data.ticket_description}' },
            { type: 'TextCaption', text: '${data.ticket_notes}' },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'request_detail_close' },
              },
            },
          ],
        },
      },

      // ─── EVENTS ───────────────────────────────────────────────────────
      {
        id: 'EVENTS',
        title: 'Upcoming Events',
        data: {
          events_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_events_banner: { type: 'boolean', __example__: false },
          events: {
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
            __example__: [{ id: 'evt1', title: 'Public Meeting', description: '21 Jun 2026 · Chennai' }],
          },
          empty_text: { type: 'string', __example__: '' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.events_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Events',
              visible: '${data.has_events_banner}',
            },
            { type: 'TextHeading', text: 'Upcoming Events' },
            { type: 'TextBody', text: '${data.empty_text}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_event',
              label: 'Events',
              required: true,
              'data-source': '${data.events}',
            },
            {
              type: 'Footer',
              label: 'View Details',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'event_pick', selected_event: '${form.selected_event}' },
              },
            },
          ],
        },
      },

      // ─── EVENT_DETAILS ────────────────────────────────────────────────
      {
        id: 'EVENT_DETAILS',
        title: 'Event Details',
        data: {
          event_image: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_event_image: { type: 'boolean', __example__: false },
          event_title: { type: 'string', __example__: 'Public Meeting' },
          event_meta: { type: 'string', __example__: '21 Jun 2026 · Chennai' },
          event_description: { type: 'string', __example__: '' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.event_image}',
              width: 1000,
              height: 250,
              'scale-type': 'cover',
              'alt-text': 'Event',
              visible: '${data.has_event_image}',
            },
            { type: 'TextHeading', text: '${data.event_title}' },
            { type: 'TextCaption', text: '${data.event_meta}' },
            { type: 'TextBody', text: '${data.event_description}' },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'event_detail_close' },
              },
            },
          ],
        },
      },

      // ─── SOCIAL_SELECT ──────────────────────────────────────────────────
      // Terminal RadioButtonsGroup of platforms. Tap Continue closes the
      // flow with `post_action: 'social_media'` + the chosen `platform`;
      // the dispatcher then sends a platform-specific CTA URL message.
      {
        id: 'SOCIAL_SELECT',
        title: 'Social Media',
        terminal: true,
        success: true,
        data: {
          social_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_social_banner: { type: 'boolean', __example__: false },
          social_options: {
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
              { id: 'facebook', title: 'Facebook', description: 'Official Facebook page' },
              { id: 'instagram', title: 'Instagram', description: 'Official Instagram handle' },
              { id: 'youtube', title: 'YouTube', description: 'Official YouTube channel' },
              { id: 'twitter', title: 'X (Twitter)', description: 'Official X handle' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.social_banner}',
              width: 1000,
              height: 200,
              'scale-type': 'cover',
              'alt-text': 'Social Media',
              visible: '${data.has_social_banner}',
            },
            { type: 'TextHeading', text: 'Follow TVK online' },
            { type: 'TextBody', text: 'Choose a platform to open:' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_platform',
              label: 'Platforms',
              required: true,
              'data-source': '${data.social_options}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'complete',
                payload: {
                  post_action: 'social_media',
                  platform: '${form.selected_platform}',
                },
              },
            },
          ],
        },
      },

      // ─── SERVICE_SELECT (existing 9 services) ─────────────────────────
      {
        id: 'SERVICE_SELECT',
        title: 'Choose Service',
        data: {
          service_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_service_banner: { type: 'boolean', __example__: false },
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
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.service_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Service',
              visible: '${data.has_service_banner}',
            },
            { type: 'TextBody', text: 'Choose the area you want help with:' },
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
                payload: { action: 'service_pick', selected_service: '${form.selected_service}' },
              },
            },
          ],
        },
      },

      // ─── OPTION_SELECT ────────────────────────────────────────────────
      // Terminal screen: Continue closes the flow with `post_action:
      // 'option_select'` carrying the chosen `service_id` + `selected_option`.
      // The webhook then dispatches via issueActions:
      //   • url / pdf / contact_mla / helplines / location_*  → message
      //   • ticket / details_then_url                         → fresh sub-flow
      //                                                          opening at DETAILS
      {
        id: 'OPTION_SELECT',
        title: 'Choose Issue',
        terminal: true,
        success: true,
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
                name: 'complete',
                payload: {
                  post_action: 'option_select',
                  service_id: '${data.service_id}',
                  selected_option: '${form.selected_option}',
                },
              },
            },
          ],
        },
      },

      // ─── DETAILS (used by `ticket` and `details_then_url` actions) ────
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
          show_school_name: { type: 'boolean', __example__: false },
          school_label: { type: 'string', __example__: 'School name' },
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
              type: 'TextInput',
              name: 'school_name',
              label: '${data.school_label}',
              required: false,
              'input-type': 'text',
              visible: '${data.show_school_name}',
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
                  school_name: '${form.school_name}',
                  description: '${form.description}',
                },
              },
            },
          ],
        },
      },

      // ─── INFO (terminal, generalised handoff) ─────────────────────────
      {
        id: 'INFO',
        title: 'Done',
        terminal: true,
        success: true,
        data: {
          info_title: { type: 'string', __example__: 'Thank you' },
          info_body: { type: 'string', __example__: 'We will get back to you shortly.' },
          /**
           * post_action / post_data_b64 are read by the webhook after the
           * user taps Close. Both default to '' — for terminal screens that
           * don't need any follow-up message, we just leave them empty.
           */
          post_action: { type: 'string', __example__: '' },
          post_data_b64: { type: 'string', __example__: '' },
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
                payload: {
                  post_action: '${data.post_action}',
                  post_data_b64: '${data.post_data_b64}',
                },
              },
            },
          ],
        },
      },
    ],
  };
}

module.exports = { buildFlowJSON };
