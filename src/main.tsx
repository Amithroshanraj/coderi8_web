import { createRoot } from "react-dom/client";
import {
	createBrowserRouter,
	RouterProvider,
} from "react-router-dom";
import App from "./App.tsx";
import Index from "./pages/Index";
import About from "./pages/About";
import Courses from "./pages/Courses";
import Internship from "./pages/Internship";
import Projects from "./pages/Projects";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import "./index.css";

const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <App />,
			children: [
				{ index: true, element: <Index /> },
				{ path: "about", element: <About /> },
				{ path: "courses", element: <Courses /> },
				{ path: "internship", element: <Internship /> },
				{ path: "projects", element: <Projects /> },
				{ path: "contact", element: <Contact /> },
				{ path: "*", element: <NotFound /> },
			],
		},
	],
	{
		future: { v7_relativeSplatPath: true },
	}
);

createRoot(document.getElementById("root")!).render(
	<RouterProvider router={router} />
);
