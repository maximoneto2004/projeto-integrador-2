import heartsbrand from "@/assets/images/heartsBrand.png";

interface SectionTitleProps {
  title: string;
  id?: string;
}

export const SectionTitle = ({ title, id }: SectionTitleProps) => {
  return (
    <div className="relative flex items-center justify-center">
      <img
        src={heartsbrand}
        alt="corações marca"
        className="w-[40px] animate-pulse portal-image"
      />
      <h2
        id={id}
        className="my-8 text-4xl lg:text-5xl text-gray-900 dark:text-portal-text-strong text-center leading-tight text-portal-secondary font-black"
      >
        {title}
      </h2>
    </div>
  );
};
