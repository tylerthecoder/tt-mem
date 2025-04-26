import { createBrowserRouter } from "react-router-dom";
import App from "../App"; // Adjust path as needed
import HomePage from "../pages/HomePage";
import EditDeckPage from "../pages/EditDeckPage";
import PlayDeckPage from "../pages/PlayDeckPage";
import LoginPage from "../pages/LoginPage";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true, // This makes HomePage the default route for "/"
                element: <HomePage />,
            },
            {
                path: "login",
                element: <LoginPage />,
            },
            {
                path: "deck/:deckId/edit",
                element: <EditDeckPage />,
            },
            {
                path: "deck/:deckId/play",
                element: <PlayDeckPage />,
            },
            // TODO: Add a 404 Not Found route
        ],
    },
]);

export default router;