import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-md my-10">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Effective date: June 2024</p>

      <section className="mb-6">
        <p className="text-gray-700">
          Welcome to WeVoters (“we,” “our,” or “us”). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application WeVoters.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
        <p className="text-gray-700 mb-2">
          WeVoters collects personal data necessary to fulfill its purpose of collecting ward member information. The types of information we collect include:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>
            <span className="font-medium">Personal Identification Information:</span> Name, address, phone number, email address, and other contact details of ward members.
          </li>
          <li>
            <span className="font-medium">Demographic Information:</span> Age, gender, and other relevant demographic data as provided by users.
          </li>
          <li>
            <span className="font-medium">Other Data:</span> Any additional information voluntarily provided by users for the purpose of data collection.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
        <p className="text-gray-700 mb-2">We use the collected data solely to:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Maintain an accurate and up-to-date database of ward members.</li>
          <li>Assist local administrators in managing community data effectively.</li>
          <li>Facilitate communication and planning for community development.</li>
          <li>Comply with legal obligations, if any.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Data Storage and Security</h2>
        <p className="text-gray-700">
          We take the security of your data seriously and implement appropriate technical and organizational measures to protect your information from unauthorized access, alteration, disclosure, or destruction. Your data is stored securely and only accessible to authorized personnel.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Data Sharing and Disclosure</h2>
        <p className="text-gray-700 mb-2">We do not sell, trade, or rent your personal information to third parties. We may share your data only in the following circumstances:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>With your explicit consent.</li>
          <li>To comply with legal requirements or government requests.</li>
          <li>With trusted service providers who assist us in operating the app, under strict confidentiality agreements.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of any inaccurate or incomplete data.</li>
          <li>Request deletion of your personal data, subject to legal or operational limitations.</li>
          <li>Withdraw consent at any time where processing is based on your consent.</li>
        </ul>
        <p className="text-gray-700 mt-2">
          To exercise these rights, please contact us at <span className="font-medium">weclocks@gmail.com</span>.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Children’s Privacy</h2>
        <p className="text-gray-700">
          WeVoters is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected data from a child under 13, please contact us immediately.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Changes to This Privacy Policy</h2>
        <p className="text-gray-700">
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page with an updated effective date. We encourage you to review this policy periodically.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">8. Contact Us</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Email: weclocks@gmail.com</li>
          <li>Website: www.weclocks.com</li>
        </ul>
        <p className="text-gray-700 mt-4">Thank you for trusting WeVoters with your data.</p>
      </section>
    </div>
  );
};

export default PrivacyPolicy;