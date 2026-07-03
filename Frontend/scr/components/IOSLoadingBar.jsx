// src/components/IOSLoadingBar.jsx
import React from 'react';
import { motion } from 'framer-motion';

const IOSLoadingBar = () => {
  return (
    <div className="fixed top-0 left-0 w-full z-50">
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          duration: 1.5,
          ease: "easeInOut",
        }}
        className="h-1 bg-gradient-to-r from-purple-600 to-blue-600 origin-left"
        style={{
          transformOrigin: '0% 50%'
        }}
      />
    </div>
  );
};

export default IOSLoadingBar;
