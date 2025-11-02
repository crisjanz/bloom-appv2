import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Button from "@shared/ui/components/ui/button/Button";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  position: number;
  isActive: boolean;
}

const FAQManagementCard = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({ question: "", answer: "", isActive: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/faqs');
      if (response.ok) {
        const data = await response.json();
        setFaqs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load FAQs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({ question: "", answer: "", isActive: true });
    setShowModal(true);
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({ question: faq.question, answer: faq.answer, isActive: faq.isActive });
    setShowModal(true);
  };

  const handleSaveModal = async () => {
    setIsSaving(true);
    try {
      if (editingFaq) {
        // Update existing FAQ
        const response = await fetch(`/api/settings/faqs/${editingFaq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          alert('FAQ updated successfully');
          loadFAQs();
          setShowModal(false);
        } else {
          alert('Failed to update FAQ');
        }
      } else {
        // Create new FAQ
        const response = await fetch('/api/settings/faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          alert('FAQ created successfully');
          loadFAQs();
          setShowModal(false);
        } else {
          alert('Failed to create FAQ');
        }
      }
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      alert('Failed to save FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      const response = await fetch(`/api/settings/faqs/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('FAQ deleted successfully');
        loadFAQs();
      } else {
        alert('Failed to delete FAQ');
      }
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
      alert('Failed to delete FAQ');
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      const response = await fetch(`/api/settings/faqs/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !faq.isActive }),
      });

      if (response.ok) {
        loadFAQs();
      } else {
        alert('Failed to toggle FAQ status');
      }
    } catch (error) {
      console.error('Failed to toggle FAQ status:', error);
      alert('Failed to toggle FAQ status');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...faqs];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderFAQs(newOrder);
  };

  const handleMoveDown = async (index: number) => {
    if (index === faqs.length - 1) return;
    const newOrder = [...faqs];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderFAQs(newOrder);
  };

  const reorderFAQs = async (newOrder: FAQ[]) => {
    try {
      const faqIds = newOrder.map((faq) => faq.id);
      const response = await fetch('/api/settings/faqs/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqIds }),
      });

      if (response.ok) {
        loadFAQs();
      } else {
        alert('Failed to reorder FAQs');
      }
    } catch (error) {
      console.error('Failed to reorder FAQs:', error);
      alert('Failed to reorder FAQs');
    }
  };

  return (
    <>
      <ComponentCardCollapsible title="FAQ Management" defaultOpen={false}>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} total
              </p>
              <Button onClick={handleCreate} className="bg-primary text-white">
                + Add New FAQ
              </Button>
            </div>

            {faqs.length > 0 ? (
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div
                    key={faq.id}
                    className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 p-4 rounded border border-stroke"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-500">
                          {index + 1}.
                        </span>
                        <h4 className="font-semibold">{faq.question}</h4>
                        {!faq.isActive && (
                          <span className="text-xs bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {faq.answer}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="px-2 py-1 text-sm rounded border border-stroke disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === faqs.length - 1}
                        className="px-2 py-1 text-sm rounded border border-stroke disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleToggleActive(faq)}
                        className={`px-2 py-1 text-sm rounded border border-stroke ${
                          faq.isActive
                            ? 'bg-green-100 dark:bg-green-900'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                        title={faq.isActive ? 'Hide' : 'Show'}
                      >
                        {faq.isActive ? '👁️' : '👁️‍🗨️'}
                      </button>
                      <button
                        onClick={() => handleEdit(faq)}
                        className="px-2 py-1 text-sm rounded border border-stroke hover:bg-blue-50 dark:hover:bg-blue-900"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        className="px-2 py-1 text-sm rounded border border-stroke text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No FAQs yet. Click "Add New FAQ" to get started.
              </p>
            )}
          </div>
        )}
      </ComponentCardCollapsible>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-semibold mb-4">
              {editingFaq ? 'Edit FAQ' : 'Create New FAQ'}
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="question">Question</Label>
                <InputField
                  id="question"
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="What is your return policy?"
                />
              </div>

              <div>
                <Label htmlFor="answer">Answer</Label>
                <textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full rounded border border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                  rows={5}
                  placeholder="We accept returns within 30 days..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-5 w-5"
                />
                <Label htmlFor="isActive" className="mb-0">
                  Show on website
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="bg-gray-300 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveModal}
                disabled={isSaving || !formData.question || !formData.answer}
                className="bg-primary text-white"
              >
                {isSaving ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FAQManagementCard;
