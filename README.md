<div align="center">

# 🎨 Mono3D STL Creator

*Transform your images into stunning 3D lithophanes with precise, real-time controls*

<img src="https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif" width="400" alt="3D Printing Animation"/>

[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.182.0-000000?style=flat&logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)

</div>

## ✨ What Makes This Cool?

Mono3D transforms your black and white images into **3D printable lithophanes** with incredible detail and precision. Unlike traditional converters, this tool uses:

- 🎮 **Real-Time 3D Preview** - See your lithophane in full 3D before printing
- ⚡ **Advanced Processing** - Smart background removal, contrast enhancement, and mesh optimization
- 🎯 **Print-Ready Output** - Generates high-quality STL files optimized for 3D printing
- 🔧 **Fine-Tuned Control** - Adjust height, thickness, resolution, and smoothing in real-time

## 🚀 Features

### Core Functionality
- **Image to STL Conversion** - Upload PNG images and get 3D printable files
- **Interactive 3D Viewer** - Rotate, zoom, and inspect your lithophane
- **Background Removal** - Automatic background detection and removal
- **Contrast Enhancement** - Boost image contrast for better depth perception

### Advanced Settings
- **Height Mapping** - Control the depth and relief of your lithophane
- **Base Thickness** - Add custom base thickness for stability
- **Resolution Control** - Balance quality vs file size
- **Mesh Smoothing** - Reduce noise and improve surface quality
- **Simplification** - Optimize mesh complexity for faster printing

## 🛠️ Quick Start

### Prerequisites
- Node.js (v16 or higher)

### Installation

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd Mono3D
   npm install
   ```

2. **Launch the app**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to `http://localhost:5173` and start creating!

## 🎯 How to Use

1. **Upload Your Image** - Drop a black and white PNG file
2. **Customize Settings** - Fine-tune height, thickness, and quality
3. **Preview in 3D** - Rotate and inspect your lithophane
4. **Export STL** - Download your print-ready file

## 🎨 Pro Tips

- **Best Images**: High contrast black and white images work best
- **Resolution**: Start with 512px for quick previews, use higher for final prints
- **Height Scale**: 5-15mm works well for most lithophanes
- **Base Thickness**: 2-3mm provides good stability without wasting material

## 🚀 Deploy to Cloudflare Pages

1. Build command: `npm run build`
2. Build output directory: `dist`

---

<div align="center">
Made with ❤️ | Ready to bring your images to life in 3D?
</div>
