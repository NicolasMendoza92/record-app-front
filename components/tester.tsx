import { useCallback, useState } from "react";

type ComponentTesterProps = {
  text: string;
};

const ComponentTester = ({ text }: ComponentTesterProps) => {
  return (
    <div>
      <h2>Hi {text}</h2>
    </div>
  );
};

// no dependcencies, so it will only be created once

export default function Tester() {
  const [data, setData] = useState<any>(null);

  const handleClick = useCallback(async () => {
    const response = await fetch("/api/hello");
    const data = await response.json();
    setData(data);
  }, []);

  return (
    <div>
      <h1>Tester</h1>
      <ComponentTester text="World" />
      <button onClick={handleClick}> click me</button>
    </div>
  );
}
