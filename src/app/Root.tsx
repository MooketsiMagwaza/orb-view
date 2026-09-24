import { useEffect, useRef } from "react";
import { ConceptPage, DepartmentPage } from "../library/ConceptPage";
import { LibraryHome } from "../library/LibraryHome";
import { useRoute } from "../library/route";
import { DebatePage } from "../debate/DebatePage";
import { StudyJapanPage } from "../study-japan/StudyJapanPage";
import MapView from "./App";

/**
 * Three ways to look at the same network: the library (decks of cards), a page for one idea
 * (picture, mechanism, detail, principles), and the map (the orbs).
 */
export default function Root() {
  const [route, go] = useRoute();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [route]);

  if (route.kind === "map") {
    return <MapView key={route.id} startId={route.id} onLibrary={() => go({ kind: "library" })} />;
  }

  return (
    <div className="library-shell" ref={scroller}>
      {route.kind === "concept" ? <ConceptPage id={route.id} go={go} />
        : route.kind === "department" ? <DepartmentPage id={route.id} />
        : route.kind === "debate" ? <DebatePage />
        : route.kind === "study-japan" ? <StudyJapanPage />
        : <LibraryHome />}
    </div>
  );
}
