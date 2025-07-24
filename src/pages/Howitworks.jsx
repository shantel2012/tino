import React from "react";
import { ShieldCheck, Tag, CalendarCheck, Users } from "lucide-react";

export default function WhyChooseUs() {
  const reasons = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-blue-600" />,
      title: "Secure & Monitored Lots",
      desc: "All our parking spaces are under surveillance for maximum security.",
    },
    {
      icon: <Tag className="w-8 h-8 text-green-600" />,
      title: "Affordable Pricing",
      desc: "We offer flexible and competitive rates for daily and monthly bookings.",
    },
    {
      icon: <CalendarCheck className="w-8 h-8 text-purple-600" />,
      title: "Easy Booking Process",
      desc: "Reserve your space in just a few clicks through our user-friendly app.",
    },
    {
      icon: <Users className="w-8 h-8 text-indigo-600" />,
      title: "Trusted by Thousands",
      desc: "Over 10,000 users trust us with their parking needs across the country.",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-6 py-16 bg-gradient-to-r from-blue-50 to-white rounded-lg shadow-lg max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold text-center text-slate-900 mb-8">
        Why Choose Us
      </h1>
      <p className="text-center text-slate-700 max-w-3xl mx-auto mb-12 text-lg">
        ParkingSpaceFinder is the most trusted solution for finding and reserving secure parking across Zimbabwe.
      </p>

      <div className="grid md:grid-cols-2 gap-10 w-full">
        {reasons.map(({ icon, title, desc }, index) => (
          <div
            key={index}
            className="flex items-start space-x-5 bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex-shrink-0">{icon}</div>
            <div>
              <h2 className="text-2xl font-semibold text-blue-700 mb-2">{title}</h2>
              <p className="text-slate-600 text-base">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
