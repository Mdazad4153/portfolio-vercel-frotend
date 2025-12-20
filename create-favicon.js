const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
    const inputPath = path.join(__dirname, 'assets', 'favicon.jpg');
    const outputDir = path.join(__dirname, 'assets');

    console.log('Creating favicon from:', inputPath);

    // Create multiple PNG sizes for favicon
    const sizes = [16, 32, 48, 64, 128, 192, 256];

    try {
        // First, create a square cropped version
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Calculate crop dimensions for square
        const size = Math.min(metadata.width, metadata.height);
        const left = Math.floor((metadata.width - size) / 2);
        const top = Math.floor((metadata.height - size) / 2);

        // Create PNG versions for different sizes
        for (const s of sizes) {
            await sharp(inputPath)
                .extract({ left, top, width: size, height: size })
                .resize(s, s)
                .png()
                .toFile(path.join(outputDir, `favicon-${s}.png`));
            console.log(`Created favicon-${s}.png`);
        }

        // Create main favicon.png (32x32)
        await sharp(inputPath)
            .extract({ left, top, width: size, height: size })
            .resize(32, 32)
            .png()
            .toFile(path.join(outputDir, 'favicon.png'));
        console.log('Created favicon.png');

        // Create apple-touch-icon (180x180)
        await sharp(inputPath)
            .extract({ left, top, width: size, height: size })
            .resize(180, 180)
            .png()
            .toFile(path.join(outputDir, 'apple-touch-icon.png'));
        console.log('Created apple-touch-icon.png');

        // Create android-chrome icons
        await sharp(inputPath)
            .extract({ left, top, width: size, height: size })
            .resize(192, 192)
            .png()
            .toFile(path.join(outputDir, 'android-chrome-192x192.png'));
        console.log('Created android-chrome-192x192.png');

        await sharp(inputPath)
            .extract({ left, top, width: size, height: size })
            .resize(512, 512)
            .png()
            .toFile(path.join(outputDir, 'android-chrome-512x512.png'));
        console.log('Created android-chrome-512x512.png');

        console.log('\n✅ All favicon files created successfully!');
        console.log('Now run: npx png-to-ico assets/favicon-32.png > assets/favicon.ico');

    } catch (error) {
        console.error('Error creating favicon:', error);
    }
}

createFavicon();
