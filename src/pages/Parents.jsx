import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  Mail,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SEO from '../components/SEO';

export default function Parents() {
  const infoCards = [
    {
      icon: Calendar,
      title: 'Term Dates',
      description: 'Our meetings follow the school term calendar. We run weekly sessions during term time with occasional holiday activities and camps.',
    },
    {
      icon: CreditCard,
      title: 'Subscriptions',
      description: 'We charge a modest termly subscription to cover costs. This includes insurance, badges, and materials. Camps and trips have additional costs.',
    },
    {
      icon: ShieldCheck,
      title: 'Safeguarding',
      description: 'All our adult volunteers are DBS checked and trained in safeguarding. The safety and wellbeing of your child is our top priority.',
    },
    {
      icon: FileText,
      title: 'Uniform',
      description: 'Each section has its own uniform which can be purchased from the Scout Shop. We can advise on what\'s essential and what can wait.',
    },
  ];

  const faqs = [
    {
      question: 'What does my child need to bring each week?',
      answer: 'Your child should wear their scout uniform and bring a water bottle. For outdoor activities, appropriate clothing and footwear will be communicated in advance. We recommend labelling all items with your child\'s name.',
    },
    {
      question: 'What if my child has additional needs?',
      answer: 'Scouts is open to all young people. We work with parents to ensure every child can participate fully. Please speak to us about your child\'s needs so we can make appropriate arrangements.',
    },
    {
      question: 'Do parents need to stay during meetings?',
      answer: 'For Beavers, Cubs, and Scouts, parents don\'t need to stay but are always welcome to join in and help out! Drop-off and pick-up times are strictly observed.',
    },
    {
      question: 'What about trips and camps?',
      answer: 'We organise various trips throughout the year, from day activities to residential camps. Full information packs are provided well in advance, including consent forms, kit lists, and costs.',
    },
    {
      question: 'How can I get involved as a parent?',
      answer: 'We always welcome parent helpers! You don\'t need any experience - we provide training. You can help occasionally or become a regular volunteer. Even small contributions of time make a huge difference.',
    },
    {
      question: 'What happens in bad weather?',
      answer: 'Unless conditions are dangerous, we usually go ahead with activities - scouts are prepared! We may modify activities or move them indoors. We\'ll communicate any cancellations via our usual channels.',
    },
  ];

  const checklist = [
    'Complete the joining form with accurate information',
    'Purchase uniform essentials (we\'ll advise what you need)',
    'Join our parent communication group',
    'Mark key dates in your calendar',
    'Read our safeguarding policy',
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Parent Information | 40th Rochdale (Syke) Scouts"
        description="Everything parents need to know about 40th Rochdale (Syke) Scouts. FAQs, what to expect, meeting times, and how to get involved."
        keywords="parent information scouts, scout parent guide, what to expect scouts, scouts faq rochdale"
        path="/Parents"
      />
      {/* Hero */}
      <section className="bg-[#004851] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Information for Parents
            </h1>
            <p className="mt-6 text-xl text-gray-200">
              Everything you need to know about your child's scouting adventure
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Info Cards */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 text-center mb-12"
          >
            Key Information
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {infoCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="w-12 h-12 bg-[#7413dc]/10 rounded-lg flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-[#7413dc]" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{card.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{card.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* New Parent Checklist */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] rounded-2xl p-8 md:p-12 text-white"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6">New Parent Checklist</h2>
            <ul className="space-y-4">
              {checklist.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#ffe627] flex-shrink-0 mt-0.5" />
                  <span className="text-white/90">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-gray-600">
              Common questions from parents - click to expand
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="bg-white rounded-xl shadow-sm">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="px-6 text-left hover:no-underline">
                    <span className="font-medium text-gray-900">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-gray-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Safeguarding Notice */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">Safeguarding & Safety</h3>
                <p className="mt-2 text-gray-700">
                  The safety of every young person is our top priority. All our volunteers are 
                  vetted and trained. If you ever have any concerns about a child's welfare, 
                  please speak to a leader or contact us immediately.
                </p>
                <a 
                  href="https://www.scouts.org.uk/volunteers/staying-safe-and-safeguarding/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-[#7413dc] font-medium hover:underline"
                >
                  Learn more about safeguarding in Scouts
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-[#7413dc]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Mail className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white">Still Have Questions?</h2>
          <p className="mt-4 text-white/80 text-lg">
            We're happy to help! Get in touch with any questions about your child joining.
          </p>
          <Link to={createPageUrl('Contact')} className="inline-block mt-8">
            <Button size="lg" className="bg-white text-[#7413dc] hover:bg-gray-100">
              Contact Us
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}