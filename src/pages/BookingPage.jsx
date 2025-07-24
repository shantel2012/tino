import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CreditCard,
  Shield,
  Check,
  Loader,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const BookingPage = () => {
  const { id } = useParams();
  const [bookingStep, setBookingStep] = useState(1);
  const [parkingSpace, setParkingSpace] = useState(null);
  const [loadingParking, setLoadingParking] = useState(true);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: "",
    duration: "full-day",
    vehicle: "",
    contactNumber: "",
    specialRequests: "",
    paymentMethod: "ecocash",
  });

  useEffect(() => {
    async function fetchParking() {
      setLoadingParking(true);
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setError("Failed to load parking details.");
        setParkingSpace(null);
      } else {
        setParkingSpace(data);
      }
      setLoadingParking(false);
    }

    fetchParking();
  }, [id]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateDates = () => {
    if (!formData.checkIn || !formData.checkOut) {
      setError("Please select both check-in and check-out dates.");
      return false;
    }
    if (formData.checkOut < formData.checkIn) {
      setError("Check-out date cannot be before check-in date.");
      return false;
    }
    setError("");
    return true;
  };

  const calculateTotal = () => {
    if (!parkingSpace) return { basePrice: 0, serviceFee: 0, tax: 0, total: 0 };
    const basePrice = parkingSpace.price;
    const serviceFee = basePrice * 0.1;
    const tax = (basePrice + serviceFee) * 0.08;
    return {
      basePrice,
      serviceFee: Number(serviceFee.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number((basePrice + serviceFee + tax).toFixed(2)),
    };
  };

  const pricing = calculateTotal();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (bookingStep === 1) {
      if (!validateDates()) return;
      setBookingStep(2);
    } else if (bookingStep === 2) {
      setBookingStatus("pending");
      setError("");

      try {
        const { error } = await supabase.from("bookings").insert([
          {
            parking_space_id: parkingSpace.id,
            check_in: formData.checkIn,
            check_out: formData.checkOut,
            duration: formData.duration,
            vehicle: formData.vehicle,
            contact_number: formData.contactNumber,
            special_requests: formData.specialRequests,
            payment_method: formData.paymentMethod,
            status: "pending",
          },
        ]);

        if (error) throw error;

        setTimeout(() => {
          setBookingStatus("confirmed");
          setBookingStep(3);
        }, 3000);
      } catch (err) {
        setError("Booking failed: " + err.message);
        setBookingStatus(null);
      }
    }
  };

  if (loadingParking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  }

  if (!parkingSpace) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error loading parking space details.
      </div>
    );
  }

  if (bookingStep === 3 && bookingStatus === "confirmed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h2>
            <p className="text-gray-600">
              Your parking space has been reserved successfully.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">{parkingSpace.title || parkingSpace.name}</h3>
            <div className="flex items-center text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{parkingSpace.location}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {formData.checkIn} - {formData.checkOut}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/dashboard/user"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium block text-center"
            >
              View My Bookings
            </Link>
            <Link
              to="/"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium block text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BookingPage;
