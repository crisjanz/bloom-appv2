import { useEffect, useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";
import FAQAccordion from "../components/FAQAccordion.jsx";
import api from "../services/api.js";

const FAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const fetchFaqs = async () => {
      try {
        const response = await api.get("/settings/faqs");
        if (!isActive) return;

        const retrievedFaqs = Array.isArray(response.data) ? response.data : [];
        const activeFaqs = retrievedFaqs.filter((faq) => faq.isActive);

        setFaqs(
          activeFaqs.map((faq) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
          }))
        );
      } catch (requestError) {
        console.error("Failed to load FAQs:", requestError);
        if (isActive) {
          setError("We couldn't load the FAQs right now. Please try again soon.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchFaqs();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <>
      <Breadcrumb pageName="FAQ" />
      <FAQAccordion items={faqs} isLoading={isLoading} error={error} />
    </>
  );
};

export default FAQ;
