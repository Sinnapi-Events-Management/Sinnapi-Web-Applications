/**
 * Legal documents (Terms & Conditions, etc.) shared across all Sinnapi apps.
 *
 * Stored as structured, typed data — NOT raw markdown — so it renders
 * identically in every app via the `<LegalContent />` component in
 * `@sinnapi/ui`, with no markdown-renderer dependency or per-bundler config.
 *
 * NOTE: this is the single source of truth for the General Terms. Update the
 * copy here (and bump `effectiveDate`) rather than duplicating it per app.
 */

/** A single defined term and its meaning (e.g. Platform → "means the …"). */
export interface LegalDefinition {
  /** The defined term, rendered in bold with no surrounding quotes. */
  term: string;
  /** The remainder of the definition sentence (e.g. "means the Sinnapi website…"). */
  definition: string;
}

/** A single block of content within a section: a paragraph, list, definitions, or table. */
export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'definitions'; items: LegalDefinition[] }
  | { type: 'table'; columns: string[]; rows: string[][] };

/** A numbered section of a legal document. */
export interface LegalSection {
  /** Section heading without the leading number (e.g. "Eligibility"). */
  heading: string;
  body: LegalBlock[];
}

/** A complete legal document, ready to render. */
export interface LegalDocument {
  title: string;
  subtitle?: string;
  effectiveDate: string;
  jurisdiction?: string;
  sections: LegalSection[];
}

/**
 * Sinnapi General Terms and Conditions — governs use of the Platform by all
 * Users (both Clients and Vendors). Surfaced at `/terms` (and `/vendor-terms`
 * on the public site) in web-public, client-portal, and vendor-portal.
 */
export const generalTerms: LegalDocument = {
  title: 'General Terms and Conditions',
  subtitle: 'Governing the use of the Sinnapi Platform by all Users.',
  effectiveDate: 'June 2026',
  jurisdiction: 'Global',
  sections: [
    {
      heading: 'Introduction and Acceptance',
      body: [
        {
          type: 'paragraph',
          text: 'Welcome to Sinnapi ("Platform", "we", "us", "our"). Sinnapi is the marketplace and operations system for the events industry, owned by Oeuvre, a company registered in Uganda. By accessing or using the Platform, you ("User") agree to be bound by these General Terms and Conditions ("Terms"). If you do not agree, you must not use the Platform.',
        },
      ],
    },
    {
      heading: 'Definitions',
      body: [
        {
          type: 'definitions',
          items: [
            {
              term: 'Platform',
              definition:
                'means the Sinnapi website, mobile application, dashboard, and all associated services accessible at sinnapi.com.',
            },
            {
              term: 'User',
              definition:
                'means any individual or entity that accesses or uses the Platform, including Vendors and Clients.',
            },
            {
              term: 'Vendor',
              definition:
                'means any individual or business offering event-related services through the Platform.',
            },
            {
              term: 'Client',
              definition:
                'means any individual or business using the Platform to discover, book, or manage event-related services.',
            },
            {
              term: 'Booking',
              definition:
                'means a confirmed transaction between a Client and a Vendor facilitated through the Platform.',
            },
            {
              term: 'Escrow',
              definition:
                'means the secure holding of payment funds by Sinnapi pending completion of a Booking.',
            },
            {
              term: 'Content',
              definition:
                'means any text, images, videos, or other materials submitted to the Platform by Users.',
            },
          ],
        },
      ],
    },
    {
      heading: 'Eligibility',
      body: [
        {
          type: 'paragraph',
          text: 'To use the Platform you must: (a) be at least 18 years of age; (b) have the legal capacity to enter into binding contracts; (c) not be prohibited from using the Platform under applicable law; and (d) provide accurate and complete registration information.',
        },
      ],
    },
    {
      heading: 'Account Registration',
      body: [
        {
          type: 'paragraph',
          text: 'Users must create an account to access core Platform features. You agree to: (a) provide accurate, current, and complete information; (b) maintain the security of your login credentials; (c) notify Sinnapi immediately of any unauthorized account access; and (d) accept responsibility for all activity under your account. Sinnapi reserves the right to suspend or terminate any account that violates these Terms.',
        },
      ],
    },
    {
      heading: 'Platform Services',
      body: [
        {
          type: 'paragraph',
          text: 'Sinnapi provides the following services through the Platform:',
        },
        {
          type: 'list',
          items: [
            'A verified vendor marketplace enabling Clients to discover, compare, and book event service providers.',
            'An AI-powered matching engine that recommends vendors based on Client requirements.',
            'A quotation builder enabling vendors to create and send quotations.',
            'An escrow-backed payment system protecting both Clients and Vendors.',
            'A direct messaging system for Client-Vendor communication.',
            'An analytics dashboard for performance tracking.',
            'And more.',
          ],
        },
      ],
    },
    {
      heading: 'User Conduct',
      body: [
        {
          type: 'paragraph',
          text: 'All Users agree not to: (a) post false, misleading, or fraudulent content; (b) impersonate any person or entity; (c) engage in harassment, abuse, or discrimination; (d) attempt to circumvent the Platform to transact directly with other Users and avoid Platform fees; (e) upload malicious code or interfere with Platform operations; (f) violate any applicable law or regulation.',
        },
      ],
    },
    {
      heading: 'Payments and Fees',
      body: [
        {
          type: 'paragraph',
          text: 'Vendor subscription fees are charged monthly, quarterly, or annually as per the selected plan. All fees are non-refundable except as expressly stated. A platform transaction fee applies to bookings processed through escrow. Sinnapi reserves the right to modify fees with 30 days written notice to affected Users.',
        },
      ],
    },
    {
      heading: 'Intellectual Property',
      body: [
        {
          type: 'paragraph',
          text: 'All Platform content, trademarks, logos, and technology are the exclusive property of Sinnapi or its licensors. Users retain ownership of Content they submit but grant Sinnapi a non-exclusive, royalty-free, worldwide licence to use, reproduce, and display such Content for Platform operations and marketing purposes.',
        },
      ],
    },
    {
      heading: 'Disclaimers and Limitation of Liability',
      body: [
        {
          type: 'paragraph',
          text: "Sinnapi operates as an intermediary marketplace and is not a party to contracts between Clients and Vendors. Sinnapi does not guarantee the quality, safety, or legality of services offered by Vendors. To the maximum extent permitted by law, Sinnapi's aggregate liability shall not exceed the total fees paid by the User to Sinnapi in the 12 months preceding the claim.",
        },
      ],
    },
    {
      heading: 'Dispute Resolution',
      body: [
        {
          type: 'paragraph',
          text: "In the event of a dispute between Users, parties must first attempt to resolve the matter directly. If unresolved within 14 days, either party may escalate to Sinnapi's dispute resolution process by emailing support@sinnapi.com. Sinnapi's decision shall be final and binding with respect to escrow release. For disputes between a User and Sinnapi, parties agree to binding arbitration under the rules of the Uganda Arbitration and Conciliation Centre, with proceedings conducted in English.",
        },
      ],
    },
    {
      heading: 'Termination',
      body: [
        {
          type: 'paragraph',
          text: "Sinnapi may terminate or suspend any User account at any time for violation of these Terms, fraudulent activity, or at Sinnapi's sole discretion with 30 days notice for non-breach situations. Upon termination, the User's right to access the Platform ceases immediately.",
        },
      ],
    },
    {
      heading: 'Governing Law',
      body: [
        {
          type: 'paragraph',
          text: 'These Terms are governed by the laws of Uganda. For Users operating in other jurisdictions, local mandatory consumer protection laws shall apply to the extent required.',
        },
      ],
    },
    {
      heading: 'Amendments',
      body: [
        {
          type: 'paragraph',
          text: 'Sinnapi reserves the right to amend these Terms at any time. Material changes will be communicated via email or Platform notification with at least 14 days notice. Continued use of the Platform after the effective date constitutes acceptance.',
        },
      ],
    },
    {
      heading: 'Contact',
      body: [
        {
          type: 'paragraph',
          text: 'For all legal enquiries: legal@sinnapi.com | Sinnapi, Kampala, Uganda | sinnapi.com',
        },
      ],
    },
  ],
};

/**
 * Sinnapi Vendor Terms and Conditions — governs the relationship between
 * Sinnapi and Vendors listed on the Platform. Surfaced at `/vendor-terms` on
 * the public site and inside vendor-portal. These supplement the General Terms.
 */
export const vendorTerms: LegalDocument = {
  title: 'Vendor Terms and Conditions',
  subtitle: 'Governing the relationship between Sinnapi and Vendors listed on the Platform.',
  effectiveDate: 'June 2026',
  jurisdiction: 'Global',
  sections: [
    {
      heading: 'Vendor Eligibility and Verification',
      body: [
        {
          type: 'paragraph',
          text: 'To list on the Sinnapi Platform as a Vendor, you must complete the full verification process including: (a) submission of valid government-issued identification or business registration certificate; (b) provision of a verified phone number and email address; (c) upload of a portfolio with a minimum of 5 images or videos of real past work; (d) provision of at least 3 verifiable client references; (e) submission of proof of at least one completed paid event; and (f) provision of valid bank account details for escrow payouts.',
        },
      ],
    },
    {
      heading: 'Vendor Obligations',
      body: [
        {
          type: 'paragraph',
          text: 'As a Vendor on the Sinnapi Platform, you agree to:',
        },
        {
          type: 'list',
          items: [
            'Maintain accurate, truthful, and up-to-date profile information at all times.',
            'Deliver services as described in your profile and as agreed in each Booking.',
            'Respond to Client enquiries and quote requests within 24 hours.',
            'Update your availability calendar regularly to prevent double-bookings.',
            'Communicate professionally and respectfully with all Clients and Sinnapi staff.',
            'Notify Clients and Sinnapi immediately of any circumstances that may affect your ability to fulfill a Booking.',
            'Not solicit Clients to transact outside the Platform to avoid fees.',
            'Comply with all applicable laws and regulations in your jurisdiction.',
          ],
        },
      ],
    },
    {
      heading: 'Subscription Plans',
      body: [
        {
          type: 'paragraph',
          text: 'Vendor access to the Platform is subject to an active subscription. The following plans are available:',
        },
        {
          type: 'table',
          columns: ['Plan Name', 'Features Included', 'Price (Monthly)', 'Price (Annual)'],
          rows: [
            [
              'Basic',
              'Up to 3 service categories, standard listing visibility, basic analytics, email support.',
              'Free',
              'Free',
            ],
            [
              'Growth',
              'Up to 6 service categories, featured listing (rotational), advanced analytics, priority support.',
              '$29.99',
              '$299.99',
            ],
            [
              'Premium',
              'Unlimited service categories, top-tier featured listing, dedicated account manager, phone support, early access to new features.',
              '$59.99',
              '$599.99',
            ],
          ],
        },
        {
          type: 'paragraph',
          text: 'All plans include a 30-day free trial. Subscription fees are charged at the start of each billing cycle. Failure to maintain an active subscription will result in profile deactivation until payment is restored.',
        },
      ],
    },
    {
      heading: 'Payment Processing',
      body: [
        {
          type: 'paragraph',
          text: "All Booking payments are processed through Sinnapi's escrow system. Vendors agree to: (a) provide and maintain accurate bank account details; (b) accept that funds will only be released following confirmed service delivery; (c) pay applicable platform transaction fees as disclosed at booking; (d) not request or accept direct payments from Clients for Platform-facilitated Bookings.",
        },
      ],
    },
    {
      heading: 'Vendor Ratings and Reviews',
      body: [
        {
          type: 'paragraph',
          text: 'Clients may leave ratings and reviews following completed Bookings. Sinnapi will not remove negative reviews unless they violate Platform policies. Vendors may respond to reviews professionally. Vendors must not offer incentives in exchange for positive reviews or attempt to manipulate the review system.',
        },
      ],
    },
    {
      heading: 'Suspension and Removal',
      body: [
        {
          type: 'paragraph',
          text: 'Sinnapi reserves the right to suspend or permanently remove a Vendor from the Platform for: (a) providing false information during verification; (b) repeated failure to deliver booked services; (c) sustained low ratings below 2.5 stars; (d) violation of these Terms; (e) fraudulent activity; or (f) breach of Client trust as determined by Sinnapi. No refund of subscription fees will be made in cases of removal for cause.',
        },
      ],
    },
    {
      heading: 'Intellectual Property',
      body: [
        {
          type: 'paragraph',
          text: 'Vendors retain ownership of all Content submitted to the Platform. By submitting Content, Vendors grant Sinnapi a non-exclusive, royalty-free, worldwide licence to display, reproduce, and promote such Content for Platform and marketing purposes.',
        },
      ],
    },
    {
      heading: 'Confidentiality',
      body: [
        {
          type: 'paragraph',
          text: 'Vendors agree to maintain the confidentiality of all Client personal information accessed through the Platform and to use such information solely for the purpose of fulfilling Bookings. Vendors must comply with all applicable data protection laws.',
        },
      ],
    },
  ],
};

/**
 * Sinnapi Client and Event Planner Terms and Conditions — governs the
 * relationship between Sinnapi and Clients using the Platform. Surfaced at
 * `/client-event-planner-terms` on the public site and at `/terms` inside
 * client-portal. These supplement the General Terms.
 */
export const clientTerms: LegalDocument = {
  title: 'Client and Event Planner Terms and Conditions',
  subtitle: 'Governing the relationship between Sinnapi and Clients using the Platform.',
  effectiveDate: 'June 2026',
  jurisdiction: 'Global',
  sections: [
    {
      heading: 'Client Eligibility',
      body: [
        {
          type: 'paragraph',
          text: "To use the Platform as a Client, you must: (a) be at least 18 years of age; (b) register with accurate personal or business information; (c) have a valid payment method linked to your account; and (d) agree to these Terms and Sinnapi's Escrow Policy.",
        },
      ],
    },
    {
      heading: 'Client Rights',
      body: [
        {
          type: 'paragraph',
          text: 'As a Client on the Sinnapi Platform, you have the right to:',
        },
        {
          type: 'list',
          items: [
            'Browse and search verified vendor profiles without charge.',
            'Request quotes from multiple vendors for comparison.',
            'Review vendor portfolios, ratings, and verified credentials before booking.',
            "Make secure payments through Sinnapi's escrow system.",
            'Raise a dispute within 48 hours of an event if services were not delivered as agreed.',
            'Leave honest ratings and reviews following completed Bookings.',
            'Access all Platform features appropriate to your account type.',
          ],
        },
      ],
    },
    {
      heading: 'Client Obligations',
      body: [
        {
          type: 'paragraph',
          text: 'As a Client, you agree to:',
        },
        {
          type: 'list',
          items: [
            'Provide accurate event details and requirements when requesting quotes or making Bookings.',
            'Communicate professionally and respectfully with Vendors.',
            "Make payment in full through the Platform's escrow system to secure a Booking.",
            'Confirm satisfactory service delivery through the Platform within 48 hours of the event date.',
            'Not attempt to solicit Vendors to transact outside the Platform.',
            'Not post false, misleading, or defamatory reviews.',
            'Comply with all applicable laws in connection with your use of the Platform.',
          ],
        },
      ],
    },
    {
      heading: 'Booking Process',
      body: [
        {
          type: 'list',
          items: [
            'Client searches for and selects a Vendor on the Platform.',
            'Client sends a quote request specifying event details, date, location, and requirements.',
            'Vendor responds with a formal quotation through the Platform within 24 hours.',
            'Client reviews and accepts the quotation.',
            "Client makes full payment to Sinnapi's escrow account to confirm the Booking.",
            'Sinnapi confirms the Booking to both parties and notifies the Vendor of secured payment.',
            'Vendor delivers services on the agreed date.',
            'Client confirms delivery through the Platform within 48 hours.',
            'Sinnapi releases payment to the Vendor.',
          ],
        },
      ],
    },
    {
      heading: 'Payment Obligations',
      body: [
        {
          type: 'paragraph',
          text: 'Clients agree to: (a) make full payment through the Platform escrow system — partial payments or payments outside the Platform are not permitted; (b) not charge back or dispute payments through their financial institution unless Sinnapi’s dispute process has been exhausted; (c) accept that platform transaction fees are non-refundable; (d) ensure payment methods are valid and have sufficient funds at the time of booking.',
        },
      ],
    },
    {
      heading: 'Cancellation by Client',
      body: [
        {
          type: 'paragraph',
          text: "Client cancellations are subject to the refund schedule set out in Sinnapi's Escrow Policy. Clients acknowledge that last-minute cancellations may result in partial or no refund to protect Vendors who have prepared for the event.",
        },
      ],
    },
    {
      heading: 'Data and Privacy',
      body: [
        {
          type: 'paragraph',
          text: 'Sinnapi collects and processes Client personal data in accordance with its Privacy Policy available at sinnapi.com/privacy. Client data will not be sold to third parties. Vendors will only receive Client contact information necessary for Booking fulfillment.',
        },
      ],
    },
    {
      heading: 'Ratings and Reviews',
      body: [
        {
          type: 'paragraph',
          text: 'Clients are encouraged to leave honest ratings and reviews after each completed Booking. Reviews must be based on genuine experience and must not contain defamatory, discriminatory, or false content. Sinnapi reserves the right to remove reviews that violate Platform policies.',
        },
      ],
    },
    {
      heading: 'Limitation of Liability',
      body: [
        {
          type: 'paragraph',
          text: "Sinnapi is not responsible for the quality, safety, or performance of Vendor services. Sinnapi's liability to any Client shall not exceed the total amount paid by that Client through the Platform in the 12 months preceding the claim. Clients agree to resolve service disputes through Sinnapi's dispute resolution process before seeking external remedies.",
        },
      ],
    },
    {
      heading: 'Governing Law',
      body: [
        {
          type: 'paragraph',
          text: 'These Terms are governed by the laws of Uganda. Clients in other jurisdictions may also be entitled to protections under their local consumer protection laws.',
        },
      ],
    },
    {
      heading: 'Contact',
      body: [
        {
          type: 'paragraph',
          text: 'For client support: support@sinnapi.com | sinnapi.com/help | Sinnapi, Kampala, Uganda.',
        },
      ],
    },
  ],
};

/**
 * Sinnapi Escrow Payment Policy — governs the secure holding and release of
 * funds on the Platform. Surfaced at `/escrow-policy` on the public site and in
 * both the client-portal and vendor-portal. Shared so the policy reads
 * identically wherever Clients and Vendors encounter it.
 */
export const escrowPolicy: LegalDocument = {
  title: 'Escrow Payment Policy',
  subtitle: 'Governing the secure holding and release of funds on the Sinnapi Platform.',
  effectiveDate: 'June 2026',
  jurisdiction: 'Global',
  sections: [
    {
      heading: 'Purpose of Escrow',
      body: [
        {
          type: 'paragraph',
          text: "Sinnapi's escrow system is designed to protect both Clients and Vendors by holding payment funds securely until the terms of a Booking have been fulfilled. Sinnapi acts as a neutral escrow agent and does not earn interest on held funds.",
        },
      ],
    },
    {
      heading: 'How Escrow Works',
      body: [
        {
          type: 'list',
          items: [
            "Client initiates a Booking and pays the agreed amount to Sinnapi's escrow account.",
            'Sinnapi confirms receipt and notifies the Vendor of the confirmed Booking and secured payment.',
            'The Vendor delivers the agreed services on the date and terms specified in the Booking.',
            'The Client confirms satisfactory delivery through the Platform within 48 hours of the event date.',
            'Sinnapi releases the funds to the Vendor within 3–5 business days of confirmed delivery.',
          ],
        },
      ],
    },
    {
      heading: 'Escrow Fees',
      body: [
        {
          type: 'paragraph',
          text: 'Sinnapi charges a platform transaction fee on all escrow-processed bookings. This fee is disclosed at the time of booking and deducted from the total amount before release to the Vendor. The applicable fee rate is displayed on the Platform at sinnapi.com/pricing.',
        },
      ],
    },
    {
      heading: 'Fund Release Conditions',
      body: [
        {
          type: 'paragraph',
          text: 'Funds shall be released to the Vendor upon occurrence of any of the following:',
        },
        {
          type: 'list',
          items: [
            'The Client confirms satisfactory service delivery through the Platform.',
            '48 hours elapse after the event date without the Client raising a dispute.',
            "Sinnapi resolves a dispute in the Vendor's favour.",
          ],
        },
      ],
    },
    {
      heading: 'Refund Conditions',
      body: [
        {
          type: 'paragraph',
          text: 'Funds shall be returned to the Client upon occurrence of any of the following:',
        },
        {
          type: 'list',
          items: [
            'The Vendor cancels the Booking before the event date.',
            'The Vendor fails to deliver the agreed services without a valid reason.',
            "Sinnapi resolves a dispute in the Client's favour.",
            'Both parties mutually agree in writing to cancel the Booking.',
          ],
        },
      ],
    },
    {
      heading: 'Cancellation Policy',
      body: [
        {
          type: 'paragraph',
          text: 'Cancellations are subject to the following schedule:',
        },
        {
          type: 'table',
          columns: ['Cancellation Timing', 'Refund to Client'],
          rows: [
            ['More than 30 days before event', '100% refund'],
            ['15–30 days before event', '75% refund'],
            ['7–14 days before event', '50% refund'],
            ['Less than 7 days before event', 'No refund'],
          ],
        },
      ],
    },
    {
      heading: 'Dispute Resolution Process',
      body: [
        {
          type: 'paragraph',
          text: 'If a Client raises a dispute within 48 hours of the event date, the following process applies:',
        },
        {
          type: 'list',
          items: [
            'Client submits a dispute via the Platform with supporting evidence (photos, communications, receipts).',
            'Sinnapi notifies the Vendor and allows 5 business days for the Vendor to respond.',
            'Sinnapi reviews all evidence and makes a determination within 10 business days.',
            'Funds are released to the prevailing party within 3–5 business days of the determination.',
            "Either party may appeal Sinnapi's decision within 7 days. The appeal decision is final.",
          ],
        },
      ],
    },
    {
      heading: 'Force Majeure',
      body: [
        {
          type: 'paragraph',
          text: 'In the event of circumstances beyond the reasonable control of either party — including but not limited to natural disasters, government restrictions, civil unrest, or pandemic — Sinnapi reserves the right to hold escrow funds until the situation is resolved and will work with both parties to reach a fair resolution.',
        },
      ],
    },
    {
      heading: 'Currency and Exchange',
      body: [
        {
          type: 'paragraph',
          text: 'Payments are processed in Ugandan Shillings (UGX) for Uganda-based transactions. International transactions may be processed in USD or other supported currencies as displayed on the Platform. Currency exchange rates are determined at the time of transaction. Sinnapi is not responsible for exchange rate fluctuations.',
        },
      ],
    },
    {
      heading: 'Security of Funds',
      body: [
        {
          type: 'paragraph',
          text: 'All escrow funds are held in a dedicated, segregated account separate from Sinnapi’s operating funds. Sinnapi will not use escrow funds for any purpose other than as described in this Policy. Funds are protected by bank-grade security protocols.',
        },
      ],
    },
  ],
};

/**
 * Sinnapi Privacy Policy — governs the collection, use, and protection of
 * personal data on the Platform. Surfaced at `/privacy` on the public site and
 * inside both the client-portal and vendor-portal. Shared so the policy reads
 * identically wherever Users encounter it.
 */
export const privacyPolicy: LegalDocument = {
  title: 'Privacy Policy',
  subtitle:
    'Governing the collection, use, and protection of personal data on the Sinnapi Platform.',
  effectiveDate: 'June 2026',
  jurisdiction: 'Global',
  sections: [
    {
      heading: 'Data Controller',
      body: [
        {
          type: 'paragraph',
          text: 'Sinnapi Limited ("Sinnapi", "we", "us") is the data controller responsible for personal data collected through the Platform. Contact: privacy@sinnapi.com',
        },
      ],
    },
    {
      heading: 'Data We Collect',
      body: [
        {
          type: 'paragraph',
          text: 'We collect the following categories of personal data:',
        },
        {
          type: 'list',
          items: [
            'Identity data: full name, date of birth, government ID number.',
            'Contact data: email address, phone number, physical address.',
            'Business data: business name, registration number, tax ID, bank account details.',
            'Profile data: portfolio images/videos, service descriptions, pricing.',
            'Transaction data: booking history, payment records, escrow transactions.',
            'Technical data: IP address, device type, browser type, usage patterns.',
            'Communications data: messages exchanged through the Platform.',
          ],
        },
      ],
    },
    {
      heading: 'How We Use Your Data',
      body: [
        {
          type: 'paragraph',
          text: 'We use personal data to:',
        },
        {
          type: 'list',
          items: [
            'Verify and authenticate User identities.',
            'Facilitate bookings and process payments through escrow.',
            'Operate and improve the AI matching engine.',
            'Send transactional and service-related communications.',
            'Resolve disputes and enforce Platform policies.',
            'Comply with legal and regulatory obligations.',
            'Conduct analytics to improve Platform performance.',
          ],
        },
      ],
    },
    {
      heading: 'Data Sharing',
      body: [
        {
          type: 'paragraph',
          text: 'We do not sell personal data. We share data only as follows:',
        },
        {
          type: 'list',
          items: [
            'With Vendors: Client contact information shared only as necessary for Booking fulfillment.',
            'With Clients: Vendor profile and contact information as displayed on the Platform.',
            'With service providers: payment processors, cloud hosting, analytics tools — under strict data processing agreements.',
            'With authorities: where required by law or court order.',
          ],
        },
      ],
    },
    {
      heading: 'Data Retention',
      body: [
        {
          type: 'paragraph',
          text: 'We retain personal data for as long as necessary to provide our services and comply with legal obligations. Account data is retained for 7 years following account closure for tax and compliance purposes. Transaction records are retained for 7 years. Portfolio and profile content is deleted within 30 days of account closure upon User request.',
        },
      ],
    },
    {
      heading: 'User Rights',
      body: [
        {
          type: 'paragraph',
          text: 'Users have the right to:',
        },
        {
          type: 'list',
          items: [
            'Access: request a copy of personal data we hold about you.',
            'Correction: request correction of inaccurate personal data.',
            'Deletion: request deletion of personal data subject to legal retention requirements.',
            'Portability: request transfer of your data in a machine-readable format.',
            'Objection: object to processing of your data for marketing purposes.',
          ],
        },
        {
          type: 'paragraph',
          text: 'To exercise these rights, contact: privacy@sinnapi.com',
        },
      ],
    },
    {
      heading: 'Cookies',
      body: [
        {
          type: 'paragraph',
          text: 'The Platform uses cookies and similar tracking technologies to improve User experience, maintain sessions, and gather analytics. Users may manage cookie preferences through their browser settings. Disabling cookies may limit Platform functionality.',
        },
      ],
    },
    {
      heading: 'Security',
      body: [
        {
          type: 'paragraph',
          text: 'We implement industry-standard security measures including encryption, access controls, and regular security audits to protect personal data. However, no system is completely secure. Users are responsible for maintaining the security of their own login credentials.',
        },
      ],
    },
    {
      heading: 'International Transfers',
      body: [
        {
          type: 'paragraph',
          text: 'Sinnapi operates globally. Personal data may be transferred to and processed in countries outside your home jurisdiction. We ensure appropriate safeguards are in place for all international data transfers in compliance with applicable data protection laws.',
        },
      ],
    },
    {
      heading: "Children's Privacy",
      body: [
        {
          type: 'paragraph',
          text: 'The Platform is not directed at individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that a minor has provided personal data, we will delete it immediately.',
        },
      ],
    },
  ],
};
