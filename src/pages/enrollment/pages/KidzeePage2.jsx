import {
  PrintPage,
  CharBoxInput,
  MultiRowBoxes,
  YesNoGroup,
  KidzeeHeaderBrand,
} from "../kidzeeFormComponents.jsx";

const P2_EXPLAIN_ROWS = [39, 39, 39];

function splitExplainLines(text) {
  return (text || "").split("\n").concat(["", "", ""]).slice(0, 3);
}

function joinExplainLines(lines) {
  return lines.join("\n").replace(/\n+$/, "");
}

function ExplainRows({ value, onChange, readOnly }) {
  const lines = splitExplainLines(value);

  return (
    <div
      className={`kz-p2-row kz-p2-row--explain-boxes${readOnly ? " kz-p2-row--explain-disabled" : ""}`.trim()}
    >
      <MultiRowBoxes
        rows={P2_EXPLAIN_ROWS}
        values={lines}
        onChange={(i, v) => {
          const next = [...lines];
          next[i] = v;
          onChange(joinExplainLines(next));
        }}
        readOnly={readOnly}
      />
    </div>
  );
}

export default function KidzeePage2({
  formData,
  onChange,
  readOnly,
  branding,
  showGrid,
}) {
  const set = (path, value) => onChange(path, value);
  const doctor = formData.doctor || {};
  const health = formData.health || {};

  const setYesNoWithExplain = (yesNoPath, explainPath, next) => {
    set(yesNoPath, next);
    if (next?.no) set(explainPath, "");
  };

  return (
    <PrintPage pageNumber={2} showGrid={showGrid} branding={branding}>
      <header className="kz-p2-header">
        <KidzeeHeaderBrand branding={branding} />
      </header>

      {/* Family Doctor */}
      <div className="kz-p2-section kz-p2-section--doctor">
        <div className="kz-p2-row kz-p2-row--title">
          <h2 className="kz-section-title">Family Doctor</h2>
        </div>

        <div className="kz-p2-row kz-p2-row--name">
          <CharBoxInput
            label="Name:"
            labelClass="kz-p2-field-label"
            boxes={35}
            filter="alpha"
            value={doctor.name}
            onChange={(v) => set("doctor.name", v)}
            readOnly={readOnly}
          />
        </div>

        <div className="kz-p2-row kz-p2-row--address">
          <MultiRowBoxes
            label="Address:"
            rows={[34 , 29]}
            values={[doctor.addressLine1, doctor.addressLine2]}
            onChange={(i, v) => set(`doctor.addressLine${i + 1}`, v)}
            readOnly={readOnly}

            lastRowSuffix={
              <CharBoxInput
                label="Pin:"
                labelClass="kz-p2-field-label"
                boxes={6}
                filter="numeric"
                value={doctor.pin}
                onChange={(v) => set("doctor.pin", v)}
                readOnly={readOnly}
                inline
              />
            }
          />
        </div>

        <div className="kz-p2-row kz-p2-row--phones">
          <CharBoxInput
            label="Home Phone:"
            labelClass="kz-p2-field-label"
            boxes={12}
            filter="numeric"
            value={doctor.homePhone}
            onChange={(v) => set("doctor.homePhone", v)}
            readOnly={readOnly}
            inline
          />
          <CharBoxInput
            label="Mobile No.:"
            labelClass="kz-p2-field-label"
            boxes={15}
            filter="numeric"
            value={doctor.mobile}
            onChange={(v) => set("doctor.mobile", v)}
            readOnly={readOnly}
            inline
          />
        </div>

        <div className="kz-p2-row kz-p2-row--email">
          <CharBoxInput
            label="E-mail ID:"
            labelClass="kz-p2-field-label"
            boxes={35}
            filter="email"
            caseSensitive
            value={doctor.email}
            onChange={(v) => set("doctor.email", v)}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Allergies */}
      <div className="kz-p2-section kz-p2-section--health">
        <p className="kz-question-text kz-question-text--semibold">
          Does your child have any allergies
        </p>
        <div className="kz-p2-question-row kz-p2-question-row--inline">
          <span className="kz-question-text">
            (food, medications, environment, insects, animals etc.)?
          </span>
          <YesNoGroup
            className="kz-p2-yesno--inline"
            value={health.allergies}
            onChange={(v) =>
              setYesNoWithExplain("health.allergies", "health.allergiesExplanation", v)
            }
            readOnly={readOnly}
          />
        </div>
        <p className="kz-instruction-text">If Yes please explain</p>
        <ExplainRows
          value={health.allergiesExplanation}
          onChange={(v) => set("health.allergiesExplanation", v)}
          readOnly={readOnly || !health.allergies?.yes}
        />
      </div>

      {/* Behavioral */}
      <div className="kz-p2-section kz-p2-section--health">
        <p className="kz-question-text">
          Does your child have any physical, emotional or behavioural issues
          that may interface with his/her learning?
        </p>
        <div className="kz-p2-row kz-p2-row--behavioral-yesno">
          <YesNoGroup
            value={health.physicalEmotional}
            onChange={(v) =>
              setYesNoWithExplain(
                "health.physicalEmotional",
                "health.physicalEmotionalExplanation",
                v
              )
            }
            readOnly={readOnly}
          />
        </div>
        <p className="kz-instruction-text">If Yes please explain</p>
        <ExplainRows
          value={health.physicalEmotionalExplanation}
          onChange={(v) => set("health.physicalEmotionalExplanation", v)}
          readOnly={readOnly || !health.physicalEmotional?.yes}
        />
      </div>

      {/* Medication */}
      <div className="kz-p2-section kz-p2-section--health">
        <div className="kz-p2-question-row kz-p2-question-row--inline">
          <span className="kz-question-text">
            At home, does your child take a daily medication?
          </span>
          <YesNoGroup
            className="kz-p2-yesno--inline"
            value={health.dailyMedication}
            onChange={(v) =>
              setYesNoWithExplain(
                "health.dailyMedication",
                "health.dailyMedicationExplanation",
                v
              )
            }
            readOnly={readOnly}
          />
        </div>
        <p className="kz-instruction-text">
          If &apos;Yes,&apos; please explain including name of medication,
          dosage, route of administration and rationale for administration.
        </p>
        <ExplainRows
          value={health.dailyMedicationExplanation}
          onChange={(v) => set("health.dailyMedicationExplanation", v)}
          readOnly={readOnly || !health.dailyMedication?.yes}
        />
      </div>

      {/* Further information */}
      <div className="kz-p2-section kz-p2-section--health">
        <p className="kz-question-text">
          Is there any further information you feel we should know that may help
          us understand your child?
        </p>
        <ExplainRows
          value={health.furtherInfo}
          onChange={(v) => set("health.furtherInfo", v)}
          readOnly={readOnly}
        />
      </div>

      {/* Other comments */}
      <div className="kz-p2-section kz-p2-section--health">
        <p className="kz-question-text">
          Any other comments, which might be useful to the school authorities in
          managing your child&apos;s health care.
        </p>
        <ExplainRows
          value={health.otherComments}
          onChange={(v) => set("health.otherComments", v)}
          readOnly={readOnly}
        />
      </div>

    </PrintPage>
  );
}
