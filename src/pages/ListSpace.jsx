import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // Ensure supabaseClient.js is configured

export default function ListSpace() {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    price: "",
  });

  const [imageFile, setImageFile] = useState(null); // Image file state
  const [submitted, setSubmitted] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Fetch existing parking spaces from Supabase
  useEffect(() => {
    const fetchSpaces = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error("Error fetching spaces:", error.message);
      } else {
        const updatedSpaces = data.map((space) => ({
          ...space,
          price: space.price || 3,
        }));
        setSpaces(updatedSpaces);
      }
      setLoading(false);
    };

    fetchSpaces();
  }, [submitted]);

  // Handle form input change
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  // Upload image to Supabase Storage
  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      setUploading(true);
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `parking-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("parking-images") // Your bucket name
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: publicURL } = supabase.storage
        .from("parking-images")
        .getPublicUrl(filePath);

      return publicURL.publicUrl;
    } catch (err) {
      console.error("Image upload failed:", err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const imageUrl =
      (await uploadImage()) ||
      "https://via.placeholder.com/400x200?text=Parking+Space";

    const { data, error } = await supabase.from("parking_spaces").insert([
      {
        name: formData.name,
        location: formData.location,
        price: formData.price || 3,
        image: imageUrl,
      },
    ]);

    if (error) {
      console.error("Error inserting space:", error.message);
      alert("Error: Could not submit your parking space.");
    } else {
      setSubmitted(true);
      setFormData({ name: "", location: "", price: "" });
      setImageFile(null);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-3xl font-bold mb-6">List Your Parking Space</h1>

      {submitted && (
        <div className="text-green-600 font-semibold mb-6">
          ✅ Thank you! Your parking space has been listed.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block mb-1 font-medium">Space Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
            placeholder="e.g. Downtown Lot"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
            placeholder="e.g. 123 Main St"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Price per hour ($)</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="1"
            max="5"
            step="0.5"
            className="w-full border px-3 py-2 rounded"
            placeholder="e.g. 3"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Select Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {uploading ? "Uploading..." : "Submit Listing"}
        </button>
      </form>

      <h2 className="text-2xl font-semibold mb-4">Available Parking Spaces</h2>
      {loading ? (
        <p>Loading spaces...</p>
      ) : spaces.length === 0 ? (
        <p>No parking spaces listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {spaces.map((space) => (
            <div
              key={space.id}
              className="border rounded shadow-sm overflow-hidden hover:shadow-lg transition cursor-pointer"
            >
              <img
                src={space.image}
                alt={space.name}
                className="w-full h-40 object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold">{space.name}</h3>
                <p className="text-gray-600">{space.location}</p>
                <p className="text-green-700 font-bold mt-2">
                  ${space.price} / hr
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
