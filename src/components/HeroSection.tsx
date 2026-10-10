import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const codeSnippets = [
  { code: "print('Hello World')", delay: 0 },
  { code: "const learn = true;", delay: 2 },
  { code: "<div>Build</div>", delay: 4 },
  { code: "import skills", delay: 6 },
  { code: "SELECT * FROM success", delay: 8 },
];

export const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-fit py-16 lg:py-24 pt-20 lg:pt-0 flex items-center overflow-hidden">
      {/* Floating Code Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {codeSnippets.map((snippet, index) => (
          <motion.div
            key={index}
            className="code-bubble"
            style={{
              left: `${10 + index * 18}%`,
              animationDelay: `${snippet.delay}s`,
            }}
            initial={{ y: "100vh", opacity: 0 }}
            animate={{ 
              y: "-100vh",
              opacity: [0, 0.3, 0.3, 0],
            }}
            transition={{
              duration: 20,
              delay: snippet.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {snippet.code}
          </motion.div>
        ))}
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10  sm:py-4 md:py-2 lg:py-40">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-badge">
              100% Online • Beginner Friendly • Internship Included
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold font-heading leading-tight sm:py-4 md:py-2 lg:py-40"
          >
            Learn Tech Skills That{" "}
            <span className="gradient-text">Actually Matter</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className=" text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto  "
          >
            Learn Python, Java, Web Development, Full Stack & Data Science online with structured 6-month courses starting at{" "}
            <span className="text-primary font-semibold">₹1499 per month</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-20 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="glow" size="xl" asChild>
              <Link to="/courses">Explore Courses</Link>
            </Button>
            <Button variant="outline-glow" size="xl" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
