import foundationBaking from "@/assets/course-foundation-baking.jpg";
import advancedPastry from "@/assets/course-advanced-pastry.jpg";
import professionalMastery from "@/assets/course-professional-mastery.jpg";

export const courseImages: Record<string, string> = {
  'a1111111-1111-1111-1111-111111111111': foundationBaking,
  'b2222222-2222-2222-2222-222222222222': advancedPastry,
  'c3333333-3333-3333-3333-333333333333': professionalMastery,
};

export const getCourseImage = (courseId: string, fallback?: string): string => {
  return courseImages[courseId] || fallback || foundationBaking;
};
