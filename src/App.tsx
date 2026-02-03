import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LibraryView } from "./views/LibraryView";
import { PlaylistView } from "./views/PlaylistView";
import { FolderView } from "./views/FolderView";
import { SearchView } from "./views/SearchView";
import { WrappedView } from "./views/WrappedView";
import { LikedView } from "./views/LikedView";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LibraryView />} />
        <Route path="playlist/:id" element={<PlaylistView />} />
        <Route path="folder/:id" element={<FolderView />} />
        <Route path="liked" element={<LikedView />} />
        <Route path="search" element={<SearchView />} />
        <Route path="wrapped" element={<WrappedView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
