from flask import Flask, Response, request
import json
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

# Load channels from JSON file
with open("channels.json", "r") as f:
    channels = json.load(f)

PORT = 3000
NODE_TO_MAC_MAP = {channel["id"]: channel["mac"].lower() for channel in channels}

def get_redirect_map(host):
    """Build redirect map dynamically based on the request host."""
    return {
        f"{channel['mac'].lower()}.local": f"http://{host}:{PORT}/node{channel['id']}/"
        for channel in channels
    }

# All known endpoints from BoondockWebServer
ENDPOINTS = ["/live", "/styles.css", "/script.js", "/api", "/settings", "/audio-stream", "/stream-control"]

def rewrite_html(content, node_id):
    """Rewrite absolute URLs in HTML to include /nodeX/ prefix for all endpoints."""
    soup = BeautifulSoup(content, "html.parser")
    base_path = f"/node{node_id}"

    # Rewrite <link> tags
    for link in soup.find_all("link", href=True):
        href = link["href"]
        if href.startswith("/"):
            link["href"] = f"{base_path}{href}"
            app.logger.debug(f"Rewrote link: {href} -> {link['href']}")
        elif not href.startswith(("http://", "https://", "#")):
            link["href"] = f"{base_path}/{href}"

    # Rewrite <script> tags (src attributes)
    for script in soup.find_all("script", src=True):
        src = script["src"]
        if src.startswith("/"):
            script["src"] = f"{base_path}{src}"
            app.logger.debug(f"Rewrote script src: {src} -> {script['src']}")
        elif not src.startswith(("http://", "https://", "#")):
            script["src"] = f"{base_path}/{src}"

    # Rewrite inline <script> content for all endpoints
    for script in soup.find_all("script"):
        if script.string:
            original = script.string
            for endpoint in ENDPOINTS:
                script.string = script.string.replace(f"'{endpoint}", f"'{base_path}{endpoint}")
                script.string = script.string.replace(f'"{endpoint}', f'"{base_path}{endpoint}"')
            if original != script.string:
                app.logger.debug(f"Rewrote inline script: Added {base_path} to endpoints")

    return str(soup).encode("utf-8")

def rewrite_js(content, node_id):
    """Rewrite API calls and other endpoints in external JS files."""
    content_str = content.decode("utf-8", errors="ignore")
    original = content_str
    for endpoint in ENDPOINTS:
        content_str = content_str.replace(f"'{endpoint}", f"'/node{node_id}{endpoint}")
        content_str = content_str.replace(f'"{endpoint}', f'"/node{node_id}{endpoint}"')
    if original != content_str:
        app.logger.debug(f"Rewrote JS: Added /node{node_id} to endpoints")
    return content_str.encode("utf-8")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def handle_request(path):
    host = request.host
    hostname = host.split(":")[0]
    redirect_map = get_redirect_map(host)

    if hostname in redirect_map:
        return redirect(redirect_map[hostname], code=301)

    if path.startswith("node"):
        try:
            node_id_str = path.split("/")[0].replace("node", "")
            node_id = int(node_id_str)
            if node_id in NODE_TO_MAC_MAP:
                mac = NODE_TO_MAC_MAP[node_id]
                remaining_path = path.replace(f"node{node_id}/", "", 1)
                target_url = f"http://{mac}.local/{remaining_path}"
                if request.query_string:
                    target_url += f"?{request.query_string.decode('utf-8')}"
                app.logger.debug(f"Proxying to: {target_url}")
                response = requests.get(target_url, stream=True)
                headers = dict(response.headers)
                content_type = headers.get("Content-Type", "").lower()

                if "text/html" in content_type:
                    content = rewrite_html(response.content, node_id)
                    return Response(content, status=response.status_code, headers=headers)
                elif "javascript" in content_type or remaining_path.endswith(".js"):
                    content = rewrite_js(response.content, node_id)
                    return Response(content, status=response.status_code, headers=headers)
                else:
                    return Response(response.content, status=response.status_code, headers=headers)
            else:
                return "Node ID not found", 404
        except (ValueError, IndexError):
            return "Invalid node path", 400
        except requests.RequestException as e:
            return f"Error proxying to node: {str(e)}", 500

    return "Unknown host or path", 404

if __name__ == "__main__":
    print(f"Serving on port {PORT}")
    print("Node to MAC mappings:", NODE_TO_MAC_MAP)
    app.run(host="0.0.0.0", port=PORT, debug=True)
