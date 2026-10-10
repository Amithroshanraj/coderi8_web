import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Code, 
  Users, 
  Laptop, 
  DollarSign
} from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "Student-Friendly Learning",
    description: "We teach from basics and focus on clear understanding.",
  },
  {
    icon: Code,
    title: "Hands-On Projects",
    description: "Build real projects while learning each course.",
  },
  {
    icon: Users,
    title: "Mentor Support",
    description: "Get guidance throughout your learning journey.",
  },
  {
    icon: Laptop,
    title: "Learn From Anywhere",
    description: "Completely online learning from your home.",
  },
  {
    icon: DollarSign,
    title: "Affordable Pricing",
    description: "Affordable monthly pricing with flexible learning.",
  },
];

export const WhySection = () => {
  return (
    <section className="py-12 md:py-16 lg:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="section-badge">💡 Why Learn With Us?</span>
          <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold font-heading">
            Everything You Need to{" "}
            <span className="gradient-text">Succeed</span>
          </h2>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="glass-card-glow p-6 text-center group"
              whileHover={{ y: -4 }}
            >
              <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold font-heading text-lg">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
