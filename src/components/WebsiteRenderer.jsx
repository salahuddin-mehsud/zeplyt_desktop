// src/components/WebsiteRenderer.jsx
import HeroBlock from './blocks/HeroBlock';
import MenuBlock from './blocks/MenuBlock';
import GalleryBlock from './blocks/GalleryBlock';

// Map the string from the database to actual React components
const BlockMap = {
  Hero: HeroBlock,
  Menu: MenuBlock,
  Gallery: GalleryBlock
};

const WebsiteRenderer = ({ websiteData }) => {
  return (
    <div style={{ '--primary-color': websiteData.themeOptions.primaryColor }}>
      {websiteData.blocks.map((block, index) => {
        const Component = BlockMap[block.type];
        
        // Render the component and pass the saved data (props) into it
        if (Component) return <Component key={index} {...block.props} />;
        return null;
      })}
    </div>
  );
};