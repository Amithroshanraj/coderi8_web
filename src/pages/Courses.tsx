import { motion } from "framer-motion";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Clock, Monitor, BarChart, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const courses = [
  {
    title: "Python Programming",
    duration: "6 Months",
    mode: "Online",
    level: "Beginner to Intermediate",
    price: "₹1499 per month",
    features: ["Python fundamentals", "Programming logic", "Hands-on practice", "Mini projects"],
  },
  {
    title: "Java Programming",
    duration: "6 Months",
    mode: "Online",
    level: "Beginner to Intermediate",
    price: "₹1499 per month",
    features: ["Core Java concepts", "Object-oriented programming", "Hands-on practice", "Mini projects"],
  },
  {
    title: "Web Development",
    duration: "6 Months",
    mode: "Online",
    level: "Beginner to Intermediate",
    price: "₹1499 per month",
    features: ["HTML, CSS, JavaScript", "Responsive websites", "Hands-on practice", "Mini projects"],
  },
  {
    title: "Full Stack Development",
    duration: "6 Months",
    mode: "Online",
    level: "Beginner to Intermediate",
    price: "₹1499 per month",
    features: ["Frontend & backend basics", "Database fundamentals", "Hands-on practice", "Real projects"],
  },
  {
    title: "Data Science",
    duration: "6 Months",
    mode: "Online",
    level: "Beginner to Intermediate",
    price: "₹1499 per month",
    features: ["Data analysis basics", "Python for data science", "Hands-on practice", "Mini projects"],
  },
];

const Courses = () => {
  const [formModalOpen, setFormModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24">
        <section className="py-24 relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="section-badge">📚 Our Courses</span>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold font-heading">
                Choose Your{" "}
                <span className="gradient-text">Learning Path</span>
              </h1>
            </motion.div>

            {/* Course Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course, index) => (
                <motion.div
                  key={course.title}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="glass-card-glow p-6 lg:p-8 flex flex-col"
                >
                  <h3 className="text-xl lg:text-2xl font-bold font-heading text-foreground">
                    {course.title}
                  </h3>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Clock className="w-3 h-3" />
                      {course.duration}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                      <Monitor className="w-3 h-3" />
                      {course.mode}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      <BarChart className="w-3 h-3" />
                      {course.level}
                    </span>
                  </div>

                  {/* What you'll learn */}
                  <div className="mt-6">
                    <p className="text-sm font-medium text-foreground mb-3">What you will learn:</p>
                    <ul className="space-y-2">
                      {course.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Price & CTA */}
                  <div className="mt-auto pt-6">
                    <p className="text-lg font-bold text-primary mb-4">{course.price}</p>
                    <Button 
                      variant="glow" 
                      className="w-full group/btn"
                      onClick={() => setFormModalOpen(true)}
                    >
                      Enroll Now
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Google Form Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={() => setFormModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              aria-label="Close form"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Google Form Iframe */}
            <iframe
              src="https://forms.gle/AQrdjadGMEuFqq4s9"
              width="100%"
              height="100%"
              style={{
                minHeight: "600px",
                border: "none",
                borderRadius: "0.5rem",
              }}
              title="Course Enrollment Form"
              loading="lazy"
            >
              Loading form...
            </iframe>
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Courses;
