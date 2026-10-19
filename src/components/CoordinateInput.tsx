import { useId, useState } from "react";
import {
  decimalToDms,
  dmsToDecimal,
  formatCoordinates,
  validateCoordinates,
  type Coordinates,
  type CoordinateAxis,
  type DmsCoordinate,
} from "../../shared/model.mjs";
import { Field } from "../ui";

type Mode = "dd" | "dms";
type RawDms = {
  degrees: string;
  minutes: string;
  seconds: string;
  hemisphere: DmsCoordinate["hemisphere"];
};
type Raw = { latitude: string; longitude: string; lat: RawDms; lon: RawDms };
function rawValues(value: Coordinates | null): Raw {
  const dms = (axis: CoordinateAxis): RawDms => {
    if (!value)
      return {
        degrees: "",
        minutes: "",
        seconds: "",
        hemisphere: axis === "latitude" ? "N" : "E",
      };
    const result = decimalToDms(value[axis], axis);
    return {
      degrees: String(result.degrees),
      minutes: String(result.minutes),
      seconds: String(result.seconds),
      hemisphere: result.hemisphere,
    };
  };
  return {
    latitude: value ? String(value.latitude) : "",
    longitude: value ? String(value.longitude) : "",
    lat: dms("latitude"),
    lon: dms("longitude"),
  };
}
function numeric(text: string): number {
  // Empty, hexadecimal, Infinity and locale separators must never become 0/a valid coordinate.
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()))
    throw new Error(
      "좌표의 숫자 칸을 모두 입력하세요. 소수점은 점(.)을 사용하세요.",
    );
  return Number(text);
}
function parse(raw: Raw, mode: Mode): Coordinates | null {
  const values =
    mode === "dd"
      ? [raw.latitude, raw.longitude]
      : [
          raw.lat.degrees,
          raw.lat.minutes,
          raw.lat.seconds,
          raw.lon.degrees,
          raw.lon.minutes,
          raw.lon.seconds,
        ];
  if (values.every((v) => !v.trim())) return null;
  if (mode === "dd")
    return validateCoordinates({
      latitude: numeric(raw.latitude),
      longitude: numeric(raw.longitude),
    });
  const decimal = (dms: RawDms, axis: CoordinateAxis) =>
    dmsToDecimal(
      {
        degrees: numeric(dms.degrees),
        minutes: numeric(dms.minutes),
        seconds: numeric(dms.seconds),
        hemisphere: dms.hemisphere,
      },
      axis,
    );
  return validateCoordinates({
    latitude: decimal(raw.lat, "latitude"),
    longitude: decimal(raw.lon, "longitude"),
  });
}

// Remounted by the patrol editor when selecting/resetting a record. Raw incomplete
// input stays local; the parent blocks saving while any coordinate is invalid.
export function CoordinateInput({
  initial,
  busy,
  onChange,
}: {
  initial?: Coordinates | null;
  busy: boolean;
  onChange: (coordinates: Coordinates | null, error: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("dd");
  const [canonical, setCanonical] = useState<Coordinates | null>(
    initial ?? null,
  );
  const [raw, setRaw] = useState(() => rawValues(initial ?? null));
  const [error, setError] = useState("");
  const helpId = useId();
  const errorId = useId();
  function update(next: Raw) {
    setRaw(next);
    try {
      const coordinates = parse(next, mode);
      setCanonical(coordinates);
      setError("");
      onChange(coordinates, "");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "좌표를 확인하세요.";
      setError(message);
      onChange(null, message);
    }
  }
  return (
    <fieldset
      className="coordinate-editor"
      disabled={busy}
      aria-describedby={helpId}
    >
      <legend>
        현장 좌표 <span className="muted">선택</span>
      </legend>
      <p className="help" id={helpId}>
        위도 ±90°, 경도 ±180°. 원자료의 좌표계를 유지하는 각도 표기 변환입니다.
        도·분은 정수, 초는 0 이상 60 미만입니다.
      </p>
      <div className="coordinate-toolbar">
        <Field label="좌표 입력 형식">
          <select
            value={mode}
            disabled={!!error}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setRaw(rawValues(canonical));
            }}
          >
            <option value="dd">DD · 십진도</option>
            <option value="dms">DMS · 도·분·초</option>
          </select>
        </Field>
        <button
          type="button"
          onClick={() => {
            setRaw(rawValues(null));
            setCanonical(null);
            setError("");
            onChange(null, "");
          }}
        >
          좌표 지우기
        </button>
      </div>
      {mode === "dd" ? (
        <div className="form-row">
          {(["latitude", "longitude"] as const).map((axis) => (
            <Field
              key={axis}
              label={`${axis === "latitude" ? "위도" : "경도"} (DD)`}
            >
              <input
                inputMode="decimal"
                maxLength={32}
                value={raw[axis]}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                onChange={(e) => update({ ...raw, [axis]: e.target.value })}
                placeholder={axis === "latitude" ? "예: 37.5" : "예: 127.25"}
              />
            </Field>
          ))}
        </div>
      ) : (
        (["lat", "lon"] as const).map((axis) => {
          const name = axis === "lat" ? "위도" : "경도";
          return (
            <div className="dms-row" key={axis}>
              {(
                [
                  ["degrees", "도"],
                  ["minutes", "분"],
                  ["seconds", "초"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={`${name} ${label}`}>
                  <input
                    inputMode="decimal"
                    maxLength={32}
                    value={raw[axis][key]}
                    aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                    onChange={(e) =>
                      update({
                        ...raw,
                        [axis]: { ...raw[axis], [key]: e.target.value },
                      })
                    }
                  />
                </Field>
              ))}
              <Field label={`${name} 방향`}>
                <select
                  value={raw[axis].hemisphere}
                  onChange={(e) =>
                    update({
                      ...raw,
                      [axis]: {
                        ...raw[axis],
                        hemisphere: e.target
                          .value as DmsCoordinate["hemisphere"],
                      },
                    })
                  }
                >
                  {(axis === "lat"
                    ? [
                        ["N", "N 북위"],
                        ["S", "S 남위"],
                      ]
                    : [
                        ["E", "E 동경"],
                        ["W", "W 서경"],
                      ]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          );
        })
      )}
      <div aria-live="polite">
        {error ? (
          <p className="coordinate-error" role="alert" id={errorId}>
            {error}
          </p>
        ) : (
          <output
            className="coordinate-result"
            aria-label={mode === "dd" ? "DMS 변환 결과" : "DD 변환 결과"}
          >
            {canonical
              ? formatCoordinates(canonical, mode === "dd" ? "dms" : "dd")
              : "좌표 없음 · 위도와 경도를 함께 입력하세요."}
          </output>
        )}
      </div>
    </fieldset>
  );
}
