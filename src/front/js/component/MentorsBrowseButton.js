// // First, make sure you have shadcn/ui installed in your project
// // If not, follow installation instructions at https://ui.shadcn.com/docs/installation

// import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { ArrowRight } from "lucide-react";

// const MentorsBrowseButton = () => {
//   const [isHovered, setIsHovered] = useState(false);

//   return (
//     <div className="flex justify-center my-8">
//       <Button
//         asChild
//         size="lg"
//         variant="default"
//         className="text-lg font-bold px-6 py-6 rounded-full transition-all"
//         onMouseEnter={() => setIsHovered(true)}
//         onMouseLeave={() => setIsHovered(false)}
//       >
//         <a href="/mentor-list" className="flex items-center gap-2">
//           Browse Available Mentors Now!
//           <ArrowRight
//             className="transition-transform duration-300"
//             style={{
//               transform: isHovered ? 'translateX(5px)' : 'translateX(0)'
//             }}
//           />
//         </a>
//       </Button>
//     </div>
//   );
// };

// export default MentorsBrowseButton;

// // Then in your Home component, you can import and use it:
// // import MentorsBrowseButton from './path/to/MentorsBrowseButton';
// // 
// // Replace your search container with:
// // <MentorsBrowseButton />