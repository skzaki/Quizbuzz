const Footer = () => {
  return (
    <footer className="py-8 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-t-2 border-purple-200">
      <div className="max-w-4xl mx-auto text-center">
        {/* YSM Logo */}
        <div className="mb-4">
          <img 
            src="https://cdn.lugc.link/7ea4da5f-5fdb-4005-9863-6ad2efa5cef9/-/preview/111x56/-/format/auto/" 
            alt="YSM Logo" 
            className="mx-auto w-22 h-11 object-contain"
          />
        </div>
        
        {/* Contact Info */}
        <p className="text-gray-800 text-lg mb-4 font-medium">
          For more Info Call: +91 86240 93698
        </p>
        
        {/* Privacy Policy */}
        <p className="text-gray-800">
          <a 
            href="https://ysminfosolution.com/privacy-policy" 
            className="text-purple-600 hover:text-purple-800 transition-colors duration-300 underline font-medium"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;