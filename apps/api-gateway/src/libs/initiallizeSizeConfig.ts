import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const initializeSizeConfig = async () => {
  try {
    const existingConfig = await prisma.site_config.findFirst();
    if (!existingConfig) {
      await prisma.site_config.create({
        data: {
          categories: ['Clothing', 'Footwear', 'Accessories', 'Electronics', 'Home Appliances'],
          subCategories: {
            Electronics: ['Smartphones', 'Laptops', 'Tablets', 'Cameras'],
            'Home Appliances': ['Refrigerators', 'Washing Machines', 'Microwaves', 'Air Conditioners'],
            Clothing: ['Shirts', 'Pants', 'Dresses', 'Jackets'],
            Footwear: ['Sneakers', 'Boots', 'Sandals', 'Loafers'],
            Accessories: ['Watches', 'Bags', 'Belts', 'Hats'],
            
        },
      }
      });
      console.log('Site configuration initialized.');
    } 
  } catch (error) {
    console.error('Error initializing site configuration:', error);
  }
}

export default initializeSizeConfig;