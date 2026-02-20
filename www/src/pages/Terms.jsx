import Breadcrumb from "../components/Breadcrumb";
import TermsContent from "../components/TermsContent.jsx";

const Terms = () => {
  return (
    <div className="bg-white dark:bg-dark min-h-screen">
      <Breadcrumb pageName="Terms & Conditions" />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <TermsContent />
        </div>
      </div>
    </div>
  );
};

export default Terms;
