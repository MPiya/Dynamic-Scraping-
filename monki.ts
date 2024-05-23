import puppeteer from 'puppeteer';
import { Product } from "../scraping/product";
const fs = require('fs');


class MonkiScraper {
  source = 'Monki';
  availability = ['DK'];
  totalProducts = 0;
  scrapedProducts = 0;
  scrapedUrls = new Set<string>();
  affiliate = true;
  MAX_LIMIT = 2000;
  maxRequestSize = 27;
  scrapedProductCount = 0;
  
    products: Product[] = [];
    

  baseURL =
    'https://www.monki.com/en_dkk/clothing/view-all-clothing/_jcr_content/productlisting.products.html?orgtld=monki.com&orgtld=monki.com&orgtld=monki.com&orgtld=monki.com&offset=##ITEM_CNT##';

  browser: any;
  page: any;

    
  constructor() {
    // Initialize Puppeteer
    this.init();
  }

  async init() {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
  }

  async start() {
    const startCnt = this.maxRequestSize;
    const url = this.baseURL.replace('##ITEM_CNT##', startCnt.toString());
    await this.navigate(url, startCnt);
  }

  async logCurrentURL() {
  const currentURL = await this.page.url();
  console.log(`Currently visiting: ${currentURL}`);
}

  // async navigate(url: string, startCnt: number) {
  //    await this.page.setDefaultNavigationTimeout(5000);
  //   await this.page.goto(url);
  //    await this.logCurrentURL();
  //   const productUrls = await this.page.$$eval('div.image a', (elements: Element[]) =>
  //     elements.map((element) => (element as HTMLAnchorElement).getAttribute('href'))
  //   );

  //   for (const productUrl of productUrls) {
  //     await this.parse(productUrl);
  //   }

  //   if (startCnt <= this.MAX_LIMIT) {
  //     const newURL = this.baseURL.replace('##ITEM_CNT##', (startCnt + this.maxRequestSize).toString());
  //     await this.navigate(newURL, startCnt + this.maxRequestSize);
  //   }
  // }


  async navigate(url: string, startCnt: number, ) {
  // Define a variable to track the number of retries
    let retries = 0;
    const maxRetries = 10
  
  while (retries < maxRetries) {
    try {
      await this.page.setDefaultNavigationTimeout(5000);
      await this.page.goto(url);
      await this.logCurrentURL();
      const productUrls = await this.page.$$eval('div.image a', (elements: Element[]) =>
        elements.map((element) => (element as HTMLAnchorElement).getAttribute('href'))
      );

      for (const productUrl of productUrls) {
        await this.parse(productUrl);
      }

      if (startCnt <= this.MAX_LIMIT) {
        const newURL = this.baseURL.replace('##ITEM_CNT##', (startCnt + this.maxRequestSize).toString());
        await this.navigate(newURL, startCnt + this.maxRequestSize);
      }
        
      // If the navigation and parsing succeed, break out of the retry loop
      break;
    } catch (error) {
      if (error ) {
        console.error('Navigation timeout occurred. Retrying...');
        retries++;
        // You can add a delay between retries if needed
        // await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Handle other types of errors
        console.error('An error occurred:', error);
        // Exit the loop on other errors
        break;
      }
    }
  }
}


  async parse(url: string) {
    if (this.scrapedUrls.has(url) ) {
      return;
    }
    this.scrapedUrls.add(url);

    await this.page.goto(url);
    this.totalProducts += 1;
    await this.logCurrentURL();
    
try {
    const jsonFile = await this.page.$eval(
      'script[type="application/ld+json"]:last-of-type',
      (element: Element) => {
        const textContent = element.textContent || '';
        return JSON.parse(textContent);
      }
    );

  if (jsonFile) {
      

    const title = jsonFile.name;
    const description = jsonFile.description.replace(/<[^>]+>/g, '');;

     // Monki doesn't have discounted products so currentPrice and original price are the same
    const currentPrice = parseFloat(jsonFile.offers[0].price);
    const originalPrice = currentPrice;

    const brand = 'Monki';
    const categoryList = await this.page.$$eval(
      'li.breadcrumb-item span[itemprop="name"]',
      (elements: Element[]) => elements.map((element) => element.textContent)
    );
    const category = categoryList.length >= 3 ? categoryList[2] : categoryList[1];
    const sizes = await this.page.$$eval(
      'button.size-options.a-button-nostyle.in-stock',
      (elements: Element[]) => elements.map((element) => element.getAttribute('data-value'))
    );
      const images = jsonFile.image;
    // Handle jsonFile if it's not null
    
    
    let materials;
try {
    materials = await this.page.$eval('#articleCompositions', (element: Element) => {
    const textContent = element.textContent?.trim();
    if (textContent === null) {
      throw new Error('Materials not found');
    }
    return textContent;
  });
} catch (error: any) {
  console.error('Error while waiting for and extracting materials:', error);
  // Handle the error as needed or set materials to a default value
  
}

      const color = await this.page.$eval('.picked-color', (element: any) => {
  const span = element.querySelector('span');
  return span ? span.nextSibling?.textContent?.trim() : 'Color not found';
});

    const pIdMatch = url.match(/\.(\d+)\.html$/);
    const id = pIdMatch ? `moonki_${pIdMatch[1]}` : '';
    const relatedProductId = id ? id.slice(0, 13) : '';

    const productData : Product= {
      id,
      url,
      title,
      description,
      currentPrice,
      originalPrice,
     discounted: (originalPrice !== undefined && originalPrice !== currentPrice) ? true : false,

      currency: 'DKK',
      brand,
      color,
      category,
      sizes,
      images,
      materials,
      relatedProductId,
    };

    if (this.isProductValid(productData)) {
      this.scrapedProducts++;
      console.log(`Scraped ${this.scrapedProducts}/${this.totalProducts} products`);
      this.scrapedProductCount++;
      if (Math.round(currentPrice) !== Math.round(originalPrice)) {
        const discountedProduct = {
          ...productData,
          
          availability: this.availability,
          };
          console.log(discountedProduct)
               this.products.push(discountedProduct); 
        // Handle the discounted product as needed
      } else {
          const product = { ...productData, affiliate: this.affiliate, availability: this.availability };
          console.log(product)
          this.products.push(product);
        // Handle the non-discounted product as needed
      }
    }
    }
  } catch (error) {
    console.error('Error during parsing:', error);
    // Handle the error as needed or simply log it
  }


      
  }

  async getColor(url: string) {
    const pIdMatch = url.match(/\.(\d+)\.html$/);
    if (!pIdMatch) return '';

    const pId = pIdMatch[1];
    const allProductInfo = await this.page.$eval('script', (element: Element) => element.textContent || '');
    const searchThing = new RegExp(`'${pId}': ({.*?})`, 's');
    const productInfoMatch = allProductInfo.match(searchThing);
    if (productInfoMatch) {
      const productInfo = JSON.parse(`{${productInfoMatch[1]}}`);
      const color = productInfo.colorLoc || '';
      return color || '';
    }

    return '';
    }
    
    
isProductValid(product: any) {
  const emptyFields = Object.entries(product).filter(([field, value]) => field !== 'discounted' && !value);
  if (emptyFields.length === 0) {
    console.log(`Product ${product.url} scraped successfully`);
    return true;
  }

 console.log(`Empty fields in : ${emptyFields}, product will not be parsed`);
  return false;
}



     async close() {
    if (this.browser) {
      await this.browser.close();
      fs.writeFileSync('monki.json', JSON.stringify(this.products)); // Save the array to a JSON file
      console.log('Successfully saved JSON!');
    }
  }
    
}  
async function main() {
  const scraper = new MonkiScraper();
  await scraper.init();
    await scraper.start();
  

 await scraper.close();



}

main();

