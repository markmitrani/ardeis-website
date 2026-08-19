export type Scope = { num: string; name: string };
export type Work = {
  num: string;
  title: string;
  meta: string;
  year: string;
  body: string;
  /**
   * Case-study image, shown between the title and the description in the
   * overlay. Path is relative to `public/` — drop the file in `public/work/`
   * and reference it as `/work/<name>`. Any raster or SVG works.
   *
   * Optional: leave it out and the overlay simply closes the gap.
   */
  image?: string;
  /**
   * Live project URL. When set, the case-study image becomes a link: the
   * cursor grows and reads VISIT over it, and clicking opens the project.
   *
   * Optional — without it the image is inert and the cursor stays neutral.
   * Requires `image`, since the link is the image.
   */
  link?: string;
};

export const scopes: Scope[] = [
  { num: "01", name: "AI Integrations" },
  { num: "02", name: "Engineering" },
  { num: "03", name: "Design" },
  { num: "04", name: "Deployment" },
];

export const works: Work[] = [
  {
    num: "01",
    title: "Music Theory Canvas",
    meta: "TS · React · UI/UX",
    year: "2025",
    image: "/work/music-theory-canvas.png",
    body: "An interactive canvas for music theory, built to help students and teachers visualize and explore musical concepts. The webapp, with its engaging open canvas design, allows users to learn the way they want and results in an immersive experience that is both educational and fun.",
  },
  {
    num: "02",
    title: "Batch PDF Watermarker",
    meta: "Python · React · UI/UX",
    year: "2026",
    image: "/work/batch-pdf-watermarker.png",
    body: "A tool that automatically watermarks PDFs in bulk. Built for movie production companies, it streamlines the process of adding watermarks to large volumes of documents, saving time and effort. The tool is designed to be user-friendly and efficient, enabling users to protect their intellectual property with just a single click. Application and storefront all built and deployed in-house.",
  },
  {
    num: "03",
    title: "Food Retriever",
    meta: "Python · RAG · Embeddings",
    year: "2025",
    image: "/work/food-retriever.svg",
    body: "A retrieval-augmented generation (RAG) system that allows users to ask questions about a large collection of food-related documents. The system uses embeddings to understand the context of the user's query and retrieve relevant information from the documents. It then generates a response based on the retrieved information, providing users with accurate and helpful answers to their questions.",},
];

export const disciplines = [
  { num: "01", label: "AI Engineering" },
  { num: "02", label: "Data Science" },
  { num: "03", label: "Software Engineering" },
  { num: "04", label: "Design" },
];

export const PRACTICE_SENTENCE =
  "Interdisciplinary work is at the heart of our approach. When harnessed properly, software, data science and design are not isolated crafts. They form a whole that is greater than the sum of its parts. That whole is what we build for our clients.";
