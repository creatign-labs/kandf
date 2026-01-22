import foundationBaking from "@/assets/course-foundation-baking.jpg";
import advancedPastry from "@/assets/course-advanced-pastry.jpg";
import professionalMastery from "@/assets/course-professional-mastery.jpg";

// Map all course IDs to their images (including legacy/duplicate IDs)
export const courseImages: Record<string, string> = {
  // Official course IDs
  'a1111111-1111-1111-1111-111111111111': foundationBaking,
  'b2222222-2222-2222-2222-222222222222': advancedPastry,
  'c3333333-3333-3333-3333-333333333333': professionalMastery,
  // Legacy/duplicate course IDs (mapping to correct images)
  '11111111-1111-1111-1111-111111111111': foundationBaking,
  '22222222-2222-2222-2222-222222222222': advancedPastry,
  '33333333-3333-3333-3333-333333333333': professionalMastery,
  'ee193aec-6492-43f7-a192-9fdd80d14961': foundationBaking,
};

// Course name to image fallback mapping
const courseNameImages: Record<string, string> = {
  'foundation': foundationBaking,
  'advanced': advancedPastry,
  'professional': professionalMastery,
  'mastery': professionalMastery,
};

export const getCourseImage = (courseId: string, fallback?: string, courseTitle?: string): string => {
  // First try by ID
  if (courseImages[courseId]) {
    return courseImages[courseId];
  }
  
  // Then try by course title keyword
  if (courseTitle) {
    const titleLower = courseTitle.toLowerCase();
    for (const [keyword, image] of Object.entries(courseNameImages)) {
      if (titleLower.includes(keyword)) {
        return image;
      }
    }
  }
  
  // Return fallback or default
  return fallback || foundationBaking;
};
