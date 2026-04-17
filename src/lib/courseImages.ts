import foundationBaking from "@/assets/course-foundation-baking.jpg";
import advancedPastry from "@/assets/course-advanced-pastry.jpg";
import professionalMastery from "@/assets/course-professional-mastery.jpg";

// Course UUIDs are no longer hardcoded — fresh UUIDs are generated per-import.
// Image resolution is now done by title keyword + a stable hash fallback.
export const courseImages: Record<string, string> = {};

const FALLBACK_IMAGES = [foundationBaking, advancedPastry, professionalMastery];

const courseNameImages: Record<string, string> = {
  foundation: foundationBaking,
  beginner: foundationBaking,
  basic: foundationBaking,
  advanced: advancedPastry,
  pastry: advancedPastry,
  professional: professionalMastery,
  mastery: professionalMastery,
  artisan: professionalMastery,
  bread: professionalMastery,
};

export const getCourseImage = (courseId: string, fallback?: string, courseTitle?: string): string => {
  if (courseId && courseImages[courseId]) return courseImages[courseId];

  if (courseTitle) {
    const titleLower = courseTitle.toLowerCase();
    for (const [keyword, image] of Object.entries(courseNameImages)) {
      if (titleLower.includes(keyword)) return image;
    }
  }

  if (fallback) return fallback;

  // Stable per-course fallback based on UUID hash
  if (courseId) {
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) hash = (hash * 31 + courseId.charCodeAt(i)) | 0;
    return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
  }
  return foundationBaking;
};
