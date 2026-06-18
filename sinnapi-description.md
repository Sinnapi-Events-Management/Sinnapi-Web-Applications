SINNAPI PROJECT CONTEXT — PRODUCT DISCOVERY & REQUIREMENTS SPECIFICATION (STEP 0)
=================================================================================

Role
----

You are a **Principal Product Architect, Enterprise Solutions Architect, Senior Business Analyst, Technical Product Manager, UX Strategist, and Domain Expert**.

**This is a discovery and analysis phase only.**

**DO NOT generate any code.**

**DO NOT design UI.**

**DO NOT create a database schema.**

**DO NOT generate folder structures.**

**DO NOT generate APIs.**

Your responsibility is to completely understand the business before any architecture or implementation begins.

Nothing in this document should be ignored. Every sentence represents a business requirement.

If anything is unclear or ambiguous, **do not assume**. Instead, create a section titled **Questions & Clarifications** and list every item requiring confirmation before implementation.

Wait for approval before moving to architecture.

Project Name
============

**Sinnapi**

Mission
=======

To make it easier for everyone to plan their events at their convenience in the least time possible by providing a one-stop home for authentic event service providers across the world.

Vision
======

Empowering everyone to plan their events seamlessly wherever they are.

Story
=====

Sinnapi was founded after more than seven years of experience in the wedding and events industry.

During this time, several major challenges were identified.

Clients struggled to:

*   find authentic service providers
    
*   distinguish genuine vendors from fraudulent ones
    
*   perform due diligence
    
*   establish trust
    
*   communicate efficiently
    
*   compare quotations
    
*   coordinate bookings
    
*   manage multiple vendors
    

Service providers also struggled because:

*   they lacked visibility
    
*   competition was extremely high
    
*   they had no centralized marketplace
    
*   it was difficult to build trust with new customers
    

Sinnapi exists to solve these problems by creating a trusted ecosystem where verified vendors and clients can safely discover each other, communicate, transact, and manage events.

Business Overview
=================

Sinnapi is a Ugandan technology platform that connects event service providers with individuals, event planners, and businesses looking for trusted vendors.

The platform serves as:

*   Marketplace
    
*   Vendor Directory
    
*   Booking Platform
    
*   Quotation Platform
    
*   Messaging Platform
    
*   Escrow Payment Platform
    
*   Vendor Subscription Platform
    

The platform initially targets Uganda but is designed to scale internationally.

User Types
==========

The system supports the following primary user roles.

1\. Anonymous Visitor
---------------------

Can:

*   Browse public pages
    
*   View vendors
    
*   View events
    
*   Search vendors
    
*   Read company information
    

Cannot:

*   Chat
    
*   Book vendors
    
*   Request quotations
    
*   Leave reviews
    
*   Access dashboards
    

Authentication is required before performing any transactional activity.

2\. Client
----------

Individuals planning personal events.

Examples include:

*   Weddings
    
*   Birthdays
    
*   Introductions
    
*   Graduation parties
    
*   Baby showers
    
*   Family celebrations
    

Clients should be able to:

*   Register
    
*   Login
    
*   Manage profile
    
*   Search vendors
    
*   Filter vendors
    
*   View vendor portfolios
    
*   Request quotations
    
*   Book vendors
    
*   Chat with vendors
    
*   Chat with Sinnapi Admin
    
*   Leave ratings
    
*   Leave reviews
    
*   Pay vendors directly
    
*   Use Sinnapi Escrow
    
*   Track bookings
    
*   View booking history
    

3\. Event Planner
-----------------

Professional planners who may operate as:

*   Individuals
    
*   Registered Companies
    

Event planners have similar capabilities to clients but may manage multiple events simultaneously.

The system should support capturing additional business information where applicable.

4\. Vendor
----------

A service provider offering one or more event-related services.

Examples include:

*   Photographers
    
*   Videographers
    
*   Decorators
    
*   Caterers
    
*   Makeup artists
    
*   MCs
    
*   DJs
    
*   Venues
    
*   Florists
    
*   Security companies
    
*   Entertainment providers
    
*   Event equipment suppliers
    

A vendor may register as:

*   Individual
    
*   Registered Business
    

Each vendor may provide multiple services under a single business.

5\. Sinnapi Administrator
-------------------------

Responsible for operating and managing the entire platform.

Responsibilities include:

*   Vendor approvals
    
*   User management
    
*   Escrow management
    
*   Vendor subscriptions
    
*   Pricing plans
    
*   Payment oversight
    
*   Messaging
    
*   Event management
    
*   Platform administration
    
*   Reporting
    
*   Analytics
    
*   Vendor monitoring
    

Vendor Onboarding Process
=========================

Vendor registration is not automatic.

Every vendor must undergo an approval workflow.

The workflow is:

Vendor Application

↓

Application Review

↓

Due Diligence

↓

MOU Signing

↓

Approve or Reject

↓

If Approved

↓

30-Day Free Trial

↓

Subscription Required

↓

Public Listing

If rejected, the vendor must not appear publicly.

Vendor Information to Capture
=============================

The onboarding application should collect the following information.

Business Information
--------------------

*   Business Name
    
*   Business Location
    
*   Brief Business Biography
    
*   Primary Service Category
    
*   Multiple Service Categories
    
*   Base of Operation / City
    
*   Business Website
    

Media
-----

*   Profile Image
    
*   Primary Business Image
    
*   Gallery Images (multiple)
    
*   Videos (multiple)
    

Business Owner
--------------

*   Full Name
    
*   Email Address
    
*   Phone Number
    

Government Verification
-----------------------

*   National ID (PNG/JPG/PDF)
    

Business Details
----------------

*   Years in Operation
    

Options include:

*   Less than 1 Year
    
*   1–3 Years
    
*   3–5 Years
    
*   5–10 Years
    
*   10+ Years
    

Business Registration Number (optional)

Tax Identification Number (optional)

Banking Information
-------------------

Capture:

*   Bank Name
    
*   Account Name
    
*   Account Number
    
*   Branch
    

Banking information must be handled securely and comply with applicable data protection and financial regulations. Sensitive financial information should be protected with appropriate encryption, access controls, auditing, and least-privilege access. The frontend must never expose raw banking information unnecessarily.

Social Media
------------

Capture:

*   Facebook
    
*   Instagram
    
*   TikTok
    
*   LinkedIn
    

The system should support storing multiple social links.

Client References
-----------------

Optional.

Multiple references.

Each contains:

*   Full Name
    
*   Phone
    
*   Email
    
*   Event Worked On
    
*   Event Date
    

Proof of Work
-------------

Upload supporting documents.

PDF format.

Additional Questions
--------------------

Icandy Masterclass Alumni

Yes / No

Pricing Model

Options:

*   Fixed Packages
    
*   Hourly Rate
    
*   Custom Quotation
    
*   Combination
    

Starting Price (UGX)

Service Regions
---------------

Allow multiple selections.

Options include:

*   Kampala
    
*   Central Uganda
    
*   Eastern Uganda
    
*   Western Uganda
    
*   Northern Uganda
    
*   Nationwide
    
*   East Africa
    
*   International
    

Lead Time
---------

Choose one.

Options:

*   Same Week
    
*   1–2 Weeks
    
*   2–4 Weeks
    
*   1–3 Months
    
*   3+ Months
    

Terms
-----

Every vendor must explicitly accept:

*   Information is accurate
    
*   Vendor Terms
    
*   Escrow Policy
    
*   False information results in removal
    

Acceptance should be individually tracked.

Vendor Approval
===============

After approval:

Vendor receives:

30-Day Free Trial.

After trial:

Vendor chooses subscription.

Plans include:

*   Starter
    
*   Professional
    
*   Elite
    

Pricing is managed by the Administrator.

Inactive subscriptions suspend vendor visibility until payment is completed.

Public Website
==============

The public website serves as the marketing and discovery platform.

Primary objectives include:

*   SEO
    
*   Lead generation
    
*   Vendor discovery
    
*   Event inspiration
    
*   Brand awareness
    
*   Conversion optimization
    

Expected pages include (but are not limited to):

*   Home
    
*   About
    
*   Mission
    
*   Vision
    
*   Story
    
*   Vendors
    
*   Events
    
*   Contact
    
*   Vendor Application
    
*   Client Registration
    
*   Sign In
    

Authentication should allow users to choose whether they are signing in as:

*   Vendor
    
*   Client/Event Planner
    

Anonymous visitors must not be able to chat or book vendors.

Client Portal
=============

Authenticated clients and event planners should have access to a dedicated dashboard.

Core capabilities include:

*   Profile Management
    
*   Vendor Search
    
*   Advanced Filtering
    
*   Vendor Discovery
    
*   Vendor Profiles
    
*   Booking Management
    
*   Quotation Requests
    
*   Vendor Messaging
    
*   Admin Messaging
    
*   Escrow Checkout
    
*   Direct Vendor Payments
    
*   Booking History
    
*   Ratings
    
*   Reviews
    

Vendor Portal
=============

Authenticated vendors require an operational dashboard.

Capabilities include:

*   Profile Management
    
*   Calendar Management
    
*   Availability Management
    
*   Block Dates
    
*   Upcoming Events
    
*   Completed Events
    
*   Bookings
    
*   Messaging
    
*   Quotation Builder
    
*   Quote Templates
    
*   Order History
    
*   Escrow Visibility
    
*   Payout Visibility
    
*   Promotions
    
*   Discounts
    
*   View Public Events
    
*   Express Interest
    

Admin Portal
============

Administrators require full operational control.

Capabilities include:

*   User Management
    
*   Vendor Management
    
*   Vendor Approvals
    
*   Escrow Management
    
*   Vendor Payout Approvals
    
*   Booking Oversight
    
*   Payment Oversight
    
*   Messaging
    
*   Event Posting
    
*   Pricing Plan Management
    
*   Subscription Monitoring
    
*   Reporting
    
*   Platform Configuration
    
*   Audit Monitoring
    

Escrow Payments
===============

Clients may choose:

Option 1

Pay Vendor Directly.

Option 2

Use Sinnapi Escrow.

If escrow is selected:

Client pays 100% to Sinnapi.

Sinnapi later manages settlement with the vendor according to the agreed workflow.

The complete escrow lifecycle, including payment reconciliation, approval stages, dispute handling, refunds, and payout rules, should be identified and documented during discovery before implementation.

Messaging
=========

Messaging should support:

Client ↔ Vendor

Vendor ↔ Admin

Client ↔ Admin

Anonymous users cannot access messaging.

Ratings & Reviews
=================

Clients should be able to rate vendors after completed engagements.

The discovery phase should identify:

*   moderation requirements
    
*   edit rules
    
*   deletion rules
    
*   reporting of abusive reviews
    
*   visibility rules
    

Subscription Management
=======================

Vendor subscriptions determine public visibility.

Subscription plans:

*   Starter
    
*   Professional
    
*   Elite
    

Administrator manages:

*   pricing
    
*   billing cycle
    
*   activation
    
*   suspension
    
*   expiry
    

Notifications
=============

During discovery identify all required notifications including:

*   Email
    
*   In-App
    
*   Push (future)
    
*   Administrative alerts
    

Determine every business event that should trigger notifications.

Reporting & Analytics
=====================

Identify all reports and dashboards required by:

*   Clients
    
*   Vendors
    
*   Administrators
    

Audit Logging
=============

Every sensitive action should be auditable.

Examples include:

*   Logins
    
*   Approvals
    
*   Payments
    
*   Escrow actions
    
*   Subscription changes
    
*   Profile updates
    
*   Messaging moderation
    
*   Administrative actions
    

Business Rules
==============

Identify every business rule contained in this document.

Do not miss any.

Examples include:

*   Vendor approval required before listing.
    
*   Vendors may register as individuals or businesses.
    
*   Vendors may offer multiple services.
    
*   Anonymous users cannot transact.
    
*   Subscription expiry removes public visibility.
    
*   Escrow requires full payment to Sinnapi.
    
*   Vendor applications require due diligence.
    
*   Terms acceptance must be tracked.
    
*   Clients may pay vendors directly or through escrow.
    

Identify every additional implied business rule.

Edge Cases
==========

Identify all edge cases including, but not limited to:

*   Duplicate registrations
    
*   Vendor rejection
    
*   Subscription expiry during active bookings
    
*   Failed escrow payments
    
*   Vendor profile updates during review
    
*   Booking cancellations
    
*   Refund requests
    
*   Vendor disputes
    
*   Rating abuse
    
*   Multiple concurrent bookings
    
*   Messaging abuse
    
*   Document verification failures
    

Deliverables
============

Produce a comprehensive discovery document containing:

1.  Executive Summary
    
2.  Business Objectives
    
3.  Stakeholders
    
4.  User Personas
    
5.  Functional Requirements
    
6.  Non-Functional Requirements
    
7.  User Roles & Permissions
    
8.  Complete Business Workflows
    
9.  User Journey Maps
    
10.  System Modules
    
11.  Features by Module
    
12.  Business Rules
    
13.  Approval Flows
    
14.  Escrow Payment Flow
    
15.  Subscription Lifecycle
    
16.  Messaging Flow
    
17.  Notification Matrix
    
18.  Reporting Requirements
    
19.  Security Considerations
    
20.  Compliance Considerations
    
21.  Risks & Assumptions
    
22.  Constraints
    
23.  Edge Cases
    
24.  Open Questions & Clarifications
    
25.  Requirements Traceability Matrix mapping every requirement in this document to the proposed system modules, ensuring nothing has been omitted.
    

Do not generate implementation details or code. Your objective is to ensure the product is fully understood before architecture and development begin.