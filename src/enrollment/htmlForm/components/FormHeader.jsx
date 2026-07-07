export default function FormHeader({ schoolName, logoUrl }) {
  return (
    <header className="html-form-header">
      <div className="html-form-header__brand">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="html-form-header__logo" />
        ) : (
          <div className="html-form-header__logo-placeholder" aria-hidden />
        )}
        <div>
          <p className="html-form-header__school">{schoolName}</p>
          <h1 className="html-form-header__title">CHILD REGISTRATION FORM</h1>
          <p className="html-form-header__subtitle">ENROLLMENT FORM</p>
        </div>
      </div>
    </header>
  );
}
