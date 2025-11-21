(function extractTheme() {
    const getComputedStyle = (selector, property) => {
        const el = document.querySelector(selector);
        if (!el) return 'NOT FOUND';
        return window.getComputedStyle(el).getPropertyValue(property).trim();
    };

    const theme = {
        colors: {
            // Header
            headerBackground: getComputedStyle('header', 'background-color'),
            headerText: getComputedStyle('header a', 'color'),
            
            // Body
            bodyBackground: getComputedStyle('body', 'background-color'),
            bodyText: getComputedStyle('body', 'color'),
            
            // Buttons
            primaryButtonBg: getComputedStyle('button[type="submit"], .btn, [class*="add-to-cart"]', 'background-color'),
            primaryButtonText: getComputedStyle('button[type="submit"], .btn, [class*="add-to-cart"]', 'color'),
            primaryButtonBorder: getComputedStyle('button[type="submit"], .btn, [class*="add-to-cart"]', 'border-color'),
            primaryButtonRadius: getComputedStyle('button[type="submit"], .btn, [class*="add-to-cart"]', 'border-radius'),
            
            // Links
            linkColor: getComputedStyle('a', 'color'),
            
            // Product cards
            productCardBg: getComputedStyle('.product-card, [class*="product"]', 'background-color'),
            productCardBorder: getComputedStyle('.product-card, [class*="product"]', 'border-color'),
            
            // Text
            headingColor: getComputedStyle('h1, h2', 'color'),
            priceColor: getComputedStyle('[class*="price"]', 'color'),
        },
        
        typography: {
            // Font families
            bodyFont: getComputedStyle('body', 'font-family'),
            headingFont: getComputedStyle('h1', 'font-family'),
            
            // Sizes
            h1Size: getComputedStyle('h1', 'font-size'),
            h2Size: getComputedStyle('h2', 'font-size'),
            h3Size: getComputedStyle('h3', 'font-size'),
            bodySize: getComputedStyle('body', 'font-size'),
            
            // Weights
            h1Weight: getComputedStyle('h1', 'font-weight'),
            h2Weight: getComputedStyle('h2', 'font-weight'),
            bodyWeight: getComputedStyle('body', 'font-weight'),
            
            // Button
            buttonSize: getComputedStyle('button[type="submit"], .btn', 'font-size'),
            buttonWeight: getComputedStyle('button[type="submit"], .btn', 'font-weight'),
            buttonLetterSpacing: getComputedStyle('button[type="submit"], .btn', 'letter-spacing'),
            buttonTransform: getComputedStyle('button[type="submit"], .btn', 'text-transform'),
        },
        
        spacing: {
            buttonPadding: getComputedStyle('button[type="submit"], .btn', 'padding'),
            cardPadding: getComputedStyle('.product-card, [class*="product"]', 'padding'),
        }
    };
    
    console.log('=== Shopify THEME ===');
    console.log(JSON.stringify(theme, null, 2));
    console.log('\n\nCopy the output above and share it!');
    
    return theme;
})();
