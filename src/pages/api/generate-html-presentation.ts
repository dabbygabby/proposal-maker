/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DesignLibrary from "@/models/DesignLibrary";

interface Slide {
  id: string;
  title: string;
  content: string;
  type: 'title' | 'content' | 'bullet' | 'image' | 'mixed';
  bullets?: string[];
  imagePlaceholder?: string;
}

interface JsonResponse {
  slides: Slide[];
  totalSlides: number;
  presentationTitle: string;
}

function generateHTMLPresentation(jsonData: JsonResponse, designLibrary: any): string {
  const { slides, presentationTitle } = jsonData;
  const cssVariables = designLibrary.cssVariables;

  // Extract CSS variables and create a clean CSS block
  const cssBlock = cssVariables || `
    :root {
      --primary: #3b82f6;
      --secondary: #64748b;
      --text: #1f2937;
      --background: #ffffff;
      --space-sm: 0.5rem;
      --space-md: 1rem;
      --space-lg: 2rem;
      --space-xl: 3rem;
      --font-sm: 0.875rem;
      --font-md: 1rem;
      --font-lg: 1.25rem;
      --font-xl: 1.5rem;
      --font-2xl: 2rem;
      --font-3xl: 2.5rem;
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${presentationTitle}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--background);
            padding: var(--space-md);
        }

        ${cssBlock}

        .presentation-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: var(--space-lg) 0;
        }

        .presentation-title {
            font-size: var(--font-3xl);
            font-weight: bold;
            color: var(--primary);
            text-align: center;
            margin-bottom: var(--space-xl);
            padding-bottom: var(--space-lg);
            border-bottom: 3px solid var(--primary);
        }

        .slide {
            margin-bottom: var(--space-xl);
            padding: var(--space-lg);
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .slide-title {
            font-size: var(--font-2xl);
            font-weight: bold;
            color: var(--primary);
            margin-bottom: var(--space-md);
            padding-bottom: var(--space-sm);
            border-bottom: 2px solid var(--secondary);
        }

        .slide-content {
            font-size: var(--font-md);
            color: var(--text);
            margin-bottom: var(--space-md);
        }

        .slide-bullets {
            margin-top: var(--space-md);
        }

        .slide-bullets ul {
            list-style: none;
            padding-left: var(--space-md);
        }

        .slide-bullets li {
            position: relative;
            margin-bottom: var(--space-sm);
            padding-left: var(--space-md);
            font-size: var(--font-md);
        }

        .slide-bullets li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: var(--primary);
            font-weight: bold;
            font-size: var(--font-lg);
        }

        .slide-image-placeholder {
            margin-top: var(--space-md);
            padding: var(--space-lg);
            background: #f8fafc;
            border: 2px dashed var(--secondary);
            border-radius: 8px;
            text-align: center;
            color: var(--secondary);
            font-style: italic;
        }

        .slide-number {
            position: absolute;
            top: var(--space-sm);
            right: var(--space-sm);
            background: var(--primary);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: var(--font-sm);
            font-weight: bold;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            body {
                padding: var(--space-sm);
            }

            .presentation-container {
                padding: var(--space-md) 0;
            }

            .presentation-title {
                font-size: var(--font-2xl);
                margin-bottom: var(--space-lg);
            }

            .slide {
                padding: var(--space-md);
                margin-bottom: var(--space-lg);
            }

            .slide-title {
                font-size: var(--font-xl);
            }

            .slide-content {
                font-size: var(--font-sm);
            }

            .slide-bullets li {
                font-size: var(--font-sm);
            }
        }

        /* Print Styles */
        @media print {
            body {
                background: white;
                padding: 0;
            }

            .slide {
                box-shadow: none;
                border: 1px solid #ccc;
                page-break-inside: avoid;
                margin-bottom: 20px;
            }

            .presentation-title {
                border-bottom: 2px solid var(--primary);
            }
        }
    </style>
</head>
<body>
    <div class="presentation-container">
        <h1 class="presentation-title">${presentationTitle}</h1>
        
        ${slides.map((slide, index) => `
            <div class="slide">
                <div class="slide-number">${index + 1}</div>
                <h2 class="slide-title">${slide.title}</h2>
                <div class="slide-content">${slide.content}</div>
                ${slide.bullets && slide.bullets.length > 0 ? `
                    <div class="slide-bullets">
                        <ul>
                            ${slide.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${slide.imagePlaceholder ? `
                    <div class="slide-image-placeholder">
                        📷 ${slide.imagePlaceholder}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;

  return html;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { jsonData, designLibraryId } = req.body;

    if (!jsonData || !designLibraryId) {
      return res.status(400).json({ 
        message: "JSON data and design library ID are required" 
      });
    }

    // Validate JSON data structure
    if (!jsonData.slides || !Array.isArray(jsonData.slides) || !jsonData.presentationTitle) {
      return res.status(400).json({ 
        message: "Invalid JSON data structure" 
      });
    }

    // Get design library
    const designLibrary = await DesignLibrary.findById(designLibraryId);
    if (!designLibrary) {
      return res.status(404).json({ message: "Design library not found" });
    }

    // Generate HTML presentation
    const htmlPresentation = generateHTMLPresentation(jsonData, designLibrary);

    return res.status(200).json({
      html: htmlPresentation,
      designLibraryName: designLibrary.name,
      presentationTitle: jsonData.presentationTitle,
      totalSlides: jsonData.slides.length
    });

  } catch (error) {
    console.error('Error generating HTML presentation:', error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
} 