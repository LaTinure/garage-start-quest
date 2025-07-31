import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-card/80 text-muted-foreground py-4 px-8 flex flex-col md:flex-row items-center justify-between animate-fade-in shadow-soft mt-auto border-t">
      <span>&copy; {new Date().getFullYear()} Garage Abidjan. Tous droits réservés.</span>
      <div className="flex gap-4 mt-2 md:mt-0">
        <a href="/mentions" className="hover:underline">Mentions légales</a>
        <a href="/contact" className="hover:underline">Contact</a>
      </div>
    </footer>
  );
};

export default Footer;
