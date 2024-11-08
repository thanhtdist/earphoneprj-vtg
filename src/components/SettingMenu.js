import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GiHamburgerMenu } from "react-icons/gi";
import '../i18n'; // Ensure i18n is initialized
import '../styles/SettingMenu.css'; // Import the CSS file

function SettingMenu() {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Track if menu is open
  const menuRef = useRef(null);

  // Toggle the menu open/close state
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Toggle menu visibility
  };

  // Close the menu if clicked outside
  const closeMenuOutsideClick = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setIsMenuOpen(false); // Close the menu when clicked outside
    }
  };

  // Listen for clicks outside of the menu to close it
  useEffect(() => {
    document.addEventListener('click', closeMenuOutsideClick);

    return () => {
      document.removeEventListener('click', closeMenuOutsideClick); // Cleanup the listener on unmount
    };
  }, []);

  useEffect(() => {
    // Update the document title when the language changes
    document.title = t('webTitle');
    // Update the <html> lang attribute whenever the language changes
    document.documentElement.setAttribute('lang', i18n.language);
    // Display audio player with the selected language
    const audioPlayer = document.querySelector('.audio-player'); // Selects the first element with the class "audioPlayer"
    console.log("audioPlayer: ", audioPlayer);
    if (audioPlayer) {
      audioPlayer.setAttribute('lang', i18n.language);
      // Check if the status label exists for the audio player
      const statusLabel = document.querySelector(".status-label");
        console.log('statusLabel', statusLabel);
        if (statusLabel) {
            //statusLabel.textContent = "Live Audio Session";  // Customize the label text
            console.log("Status label found.", statusLabel.textContent);
        } else {
            console.log("Status label not found.");
        }
    }

  }, [i18n.language, t]); // Re-run effect when language changes

  // Handle language selection change
  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value;
    i18n.changeLanguage(selectedLanguage); // Change the language
    setIsMenuOpen(false); // Close the menu after language is selected
  };

  return (
    <div className="menu-container" ref={menuRef}>
      {/* Menu Toggle Button */}
      <button className="menu-toggle" onClick={toggleMenu}>
        <GiHamburgerMenu size={24} />
      </button>

      {/* Collapsible Menu Content */}
      <div className={`menu-content ${isMenuOpen ? 'open' : ''}`}>
        {/* Language Selector */}
        {isMenuOpen && (
          <div className="language-selector">
            <label htmlFor="language-select">{t('languagesLbl')}</label>
            <select
              id="language-select"
              onChange={handleLanguageChange}
              value={i18n.language || 'en'} // Ensure fallback if i18n.language is undefined
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingMenu;
