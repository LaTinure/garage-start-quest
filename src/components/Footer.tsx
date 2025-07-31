import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 px-8 flex flex-col md:flex-row items-center justify-between text-gray-600 dark:text-gray-300">
      <span>&copy; {new Date().getFullYear()} Garage Abidjan. Tous droits réservés.</span>
      <div className="flex gap-4 mt-2 md:mt-0">
        <a href="/mentions" className="hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-colors">
          Mentions légales
        </a>
        <a href="/contact" className="hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-colors">
          Contact
        </a>
      </div>
    </footer>
  );
};

export default Footer;
