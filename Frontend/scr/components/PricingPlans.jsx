// components/GivingPlans.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Star, 
  Church, 
  Users, 
  Shield, 
  HandHelping,
  Calendar,
  Gift
} from 'lucide-react';

// Consistent church information
const CHURCH_INFO = {
  name: 'Eternal Love Church',
  tagline: 'We love God and love people',
  leaders: 'Apostle Vangeli Sibisi & Prophetess Nokwanda Sibisi',
  foundingDate: '7 July 2019',
  conference: 'Emerge Apostolic Conference',
  coreBeliefs: 'Love is the foundation for all spiritual gifts. A Christian\'s identity is shaped by love — not by talents or abilities.',
};

const GivingPlans = ({ onSelectPlan, currentPlan = null }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const givingOptions = {
    tithe: {
      name: 'Tithe',
      icon: <Church size={24} />,
      description: 'Honor God with the first fruits of your increase.',
      features: [
        'Biblical obedience to Malachi 3:10',
        'Supports church operations and ministries',
        'Tax-deductible receipt provided',
        'Part of our covenant community'
      ],
      buttonText: 'Give Tithe',
      popular: true,
      color: 'purple'
    },
    offering: {
      name: 'Offering',
      icon: <Gift size={24} />,
      description: 'Special gifts above your tithe for specific needs.',
      features: [
        'Support special projects and events',
        'Help those in need in our community',
        'Support the Emerge Apostolic Conference',
        'Tax-deductible receipt provided'
      ],
      buttonText: 'Give Offering',
      popular: false,
      color: 'blue'
    },
    missions: {
      name: 'Missions',
      icon: <Users size={24} />,
      description: 'Support local and global outreach initiatives.',
      features: [
        'Fund local community outreach programs',
        'Support church planting efforts',
        'Help spread the Gospel globally',
        'Partner with missionary organizations'
      ],
      buttonText: 'Support Missions',
      popular: false,
      color: 'green'
    },
    building: {
      name: 'Building Fund',
      icon: <HandHelping size={24} />,
      description: 'Invest in our church facilities and future growth.',
      features: [
        'Expand our worship space',
        'Develop youth and children\'s facilities',
        'Create community gathering spaces',
        'Build for future generations'
      ],
      buttonText: 'Give to Building Fund',
      popular: false,
      color: 'amber'
    }
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    if (onSelectPlan) {
      onSelectPlan(planId);
    }
  };

  const getColorClasses = (color, isPopular) => {
    const colors = {
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
        buttonLight: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
        popular: 'border-purple-500'
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        buttonLight: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
        popular: 'border-blue-500'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700',
        buttonLight: 'bg-green-100 text-green-700 hover:bg-green-200',
        popular: 'border-green-500'
      },
      amber: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-600',
        button: 'bg-amber-600 hover:bg-amber-700',
        buttonLight: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
        popular: 'border-amber-500'
      }
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
            <Heart size={32} className="text-purple-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Give Generously
        </h1>
        <p className="text-lg text-purple-600 font-medium mb-2">{CHURCH_INFO.tagline}</p>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your generosity advances the Kingdom of God and transforms lives through the power of the Holy Spirit.
        </p>
        <div className="mt-4 p-4 bg-purple-50 rounded-lg max-w-2xl mx-auto">
          <p className="text-purple-800 italic text-sm">{CHURCH_INFO.coreBeliefs}</p>
        </div>
      </div>

      {/* Giving Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {Object.entries(givingOptions).map(([planId, plan]) => {
          const colors = getColorClasses(plan.color, plan.popular);
          return (
            <motion.div
              key={planId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Object.keys(givingOptions).indexOf(planId) * 0.1 }}
              className={`relative bg-white rounded-2xl border-2 ${
                plan.popular 
                  ? `${colors.popular} shadow-xl scale-105` 
                  : 'border-gray-200 shadow-lg'
              } transition-all duration-200 hover:shadow-xl`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                    <Star size={14} className="mr-1" />
                    Most Given
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex p-3 rounded-xl ${colors.bg} ${colors.text} mb-4`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Heart size={16} className={`${colors.text} mt-0.5 mr-3 flex-shrink-0`} />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handlePlanSelect(planId)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${colors.button}`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Church Information */}
      <div className="mt-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2">{CHURCH_INFO.name}</h3>
          <p className="text-purple-100">{CHURCH_INFO.tagline}</p>
          <p className="text-purple-200 text-sm mt-1">Founded {CHURCH_INFO.foundingDate}</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="inline-flex p-2 rounded-lg bg-white/20 mb-2">
              <Calendar size={20} />
            </div>
            <h4 className="font-semibold">Service Times</h4>
            <p className="text-purple-100 text-sm">Sunday 9:30 AM</p>
            <p className="text-purple-100 text-sm">Wednesday 6:00 PM</p>
          </div>
          <div>
            <div className="inline-flex p-2 rounded-lg bg-white/20 mb-2">
              <Users size={20} />
            </div>
            <h4 className="font-semibold">Leadership</h4>
            <p className="text-purple-100 text-sm">{CHURCH_INFO.leaders}</p>
          </div>
          <div>
            <div className="inline-flex p-2 rounded-lg bg-white/20 mb-2">
              <Shield size={20} />
            </div>
            <h4 className="font-semibold">Annual Event</h4>
            <p className="text-purple-100 text-sm">{CHURCH_INFO.conference}</p>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-16 text-center">
        <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Where Your Giving Goes
          </h3>
          <p className="text-gray-600 mb-6">
            Every gift helps us fulfill our mission of sharing God's love and building a vibrant, Spirit-filled community.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-2">
                <Church size={20} className="text-purple-500 mr-2" />
                <span className="font-semibold">Church Operations</span>
              </div>
              <p className="text-gray-600 text-sm">Supporting weekly services, facilities, and ministry programs</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-2">
                <Users size={20} className="text-blue-500 mr-2" />
                <span className="font-semibold">Community Outreach</span>
              </div>
              <p className="text-gray-600 text-sm">Feeding programs, youth initiatives, and local evangelism</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-2">
                <Star size={20} className="text-amber-500 mr-2" />
                <span className="font-semibold">Emerge Conference</span>
              </div>
              <p className="text-gray-600 text-sm">Annual gathering focused on purpose and prophetic revelation</p>
            </div>
          </div>
        </div>

        {/* Scripture Reference */}
        <div className="mt-12 text-center max-w-2xl mx-auto">
          <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
            <p className="text-purple-800 italic text-lg">
              "Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this," says the Lord Almighty, "and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it."
            </p>
            <p className="text-purple-600 font-semibold mt-3">— Malachi 3:10</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GivingPlans;