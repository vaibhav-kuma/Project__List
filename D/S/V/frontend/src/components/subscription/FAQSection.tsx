'use client';

import { useState } from 'react';

const FAQS = [
  {
    question: 'What is included in Plus?',
    answer: 'Plus includes unlimited matches, unlimited video chats, advanced filters, unlimited rewinds, ad-free experience, priority matching, exclusive filters & stickers, and the ability to see who added you as a friend.',
  },
  {
    question: 'How does the free trial work?',
    answer: 'New users get a 7-day free trial of Plus. You will not be charged during the trial period. You can cancel anytime before the trial ends to avoid being charged.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel your subscription at any time from the billing portal. Your access will continue until the end of your current billing period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards through Stripe. We also support Apple Pay and Google Pay on supported devices.',
  },
  {
    question: 'What happens when my subscription expires?',
    answer: 'When your subscription expires, you will be moved to the Free tier. You will lose access to premium features but your account and data will be preserved.',
  },
  {
    question: 'Can I switch between monthly and yearly billing?',
    answer: 'Yes, you can change your billing interval from the billing portal. Changes will be prorated for the current billing period.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer refunds within 14 days of purchase if you have not used any premium features. Contact our support team for assistance.',
  },
  {
    question: 'What is priority matching?',
    answer: 'Priority matching ensures you are matched with other users faster and gives you higher visibility in the matching queue.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
        Frequently Asked Questions
      </h2>

      <div className="space-y-4">
        {FAQS.map((faq, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{faq.question}</span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4">
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
