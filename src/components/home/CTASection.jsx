import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CTASection() {
  return (
    <section className="py-20 bg-[#7413dc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Join as a Scout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
          >
            <div className="w-14 h-14 bg-[#ffe627] rounded-xl flex items-center justify-center mb-6">
              <UserPlus className="w-7 h-7 text-[#7413dc]" />
            </div>
            <h3 className="text-2xl font-bold text-white">Join as a Scout</h3>
            <p className="mt-3 text-white/80">
              Ready for adventure? Sign up your child today and give them the opportunity 
              to learn new skills, make friends, and have fun!
            </p>
            <Link to={createPageUrl('JoinUs')} className="inline-block mt-6">
              <Button className="bg-white text-[#7413dc] hover:bg-gray-100">
                Register Interest
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Volunteer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
          >
            <div className="w-14 h-14 bg-[#ffe627] rounded-xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-[#7413dc]" />
            </div>
            <h3 className="text-2xl font-bold text-white">Become a Volunteer</h3>
            <p className="mt-3 text-white/80">
              You don't need to be Bear Grylls! We provide all the training you need. 
              Share your skills and make a real difference in young people's lives.
            </p>
            <Link to={createPageUrl('Volunteer')} className="inline-block mt-6">
              <Button className="bg-white text-[#7413dc] hover:bg-gray-100">
                Volunteer Today
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}