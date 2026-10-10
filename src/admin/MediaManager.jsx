// src/admin/MediaManager.jsx
// Wish Jinny - Media Manager (Admin Panel)

import React, { useState, useEffect } from "react";
import {
  fetchMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  searchMedia,
} from "../utils/api";

function MediaManager() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchMedia();
        setMedia(res.items || []);
      } catch (err) {
        setError("⚠️ Media load नहीं हो पाया।");
      } finally {
        setLoading(false);
      }
    };
    loadMedia();
  }, []);

  const handleUpload = async (file: File, category: string) => {
    setLoading(true);
    try {
      await uploadMedia({ file, category });
      setSuccess("✅ Media uploaded.");
      const res = await fetchMedia();
      setMedia(res.items || []);
    } catch {
      setError("⚠️ Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    setLoading(true);
    try {
      await updateMedia({ id, data });
      setSuccess("✅ Media updated.");
      const res = await fetchMedia();
      setMedia(res.items || []);
    } catch {
      setError("⚠️ Update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this media?")) return;
    setLoading(true);
    try {
      await deleteMedia({ id });
      setSuccess("✅ Media deleted.");
      const res = await fetchMedia();
      setMedia(res.items || []);
    } catch {
      setError("⚠️ Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await searchMedia({ query: searchTerm, type: filterType, sort: sortBy });
      setMedia(res.items || []);
    } catch {
      setError("⚠️ Search failed.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && media.length === 0) return <p className="text-center text-indigo-700">✨ Loading media...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;
  if (media.length === 0) return <p className="text-center text-gray-600">No media found.</p>;

  return (
    <div className="media-manager px-6 py-10">
      <h1 className="text-3xl font-bold text-indigo-900 mb-6">Media Manager 🎥🖼️</h1>

      {/* Upload */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-indigo-800 mb-2">Upload Media</h2>
        <input
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const category = "general";
              handleUpload(e.target.files[0], category);
            }
          }}
          className="border rounded-md px-3 py-2 w-full"
        />
      </section>

      {/* Search & Filter */}
      <section className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search media..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-md px-3 py-2 flex-1"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="type">Type</option>
        </select>
        <button
          onClick={handleSearch}
          className="bg-indigo-700 text-white px-4 py-2 rounded-md hover:bg-indigo-800"
        >
          Search
        </button>
      </section>

      {/* Media Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {media.map((m) => (
          <div key={m.id} className="border rounded-md p-4 shadow-md">
            {m.type === "image" ? (
              <img src={m.url} alt={m.filename} className="w-full h-40 object-cover rounded-md" />
            ) : (
              <video src={m.url} controls className="w-full h-40 rounded-md" />
            )}
            <p className="font-semibold mt-2">{m.filename}</p>
            <p className="text-sm text-gray-600">Type: {m.type}</p>
            <p className="text-sm text-gray-600">Size: {m.size} KB</p>
            <p className="text-sm text-gray-600">Dimensions: {m.dimensions}</p>
            <p className="text-sm text-gray-600">Uploaded: {m.uploadDate}</p>
            <p className="text-sm text-gray-600 break-all">URL: {m.url}</p>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  const newName = prompt("Enter new filename:", m.filename);
                  if (newName) handleUpdate(m.id, { filename: newName });
                }}
                className="bg-yellow-500 text-indigo-900 px-3 py-1 rounded-md hover:bg-yellow-400"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  const fileInput = document.createElement("input");
                  fileInput.type = "file";
                  fileInput.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUpdate(m.id, { file: e.target.files[0] });
                    }
                  };
                  fileInput.click();
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
              >
                Replace
              </button>
              <button
                onClick={() => handleDelete(m.id)}
                className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>

            {/* Reuse Selection */}
            <button
              onClick={() => alert(`Selected ${m.filename} for reuse.`)}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 mt-2 w-full"
            >
              Select for Reuse
            </button>
          </div>
        ))}
      </section>

      {/* Success & Error */}
      {success && <p className="text-green-700 font-semibold mt-4">{success}</p>}
      {error && <p className="text-red-600 font-semibold mt-4">{error}</p>}
    </div>
  );
}

export default MediaManager;