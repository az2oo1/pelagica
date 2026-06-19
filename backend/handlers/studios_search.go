package handlers

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
)

var (
	logoCache  = make(map[string]string)
	videoCache = make(map[string]string)
	cacheMutex sync.RWMutex
	httpClient = &http.Client{Timeout: 5 * time.Second}

	tmdbRegex  = regexp.MustCompile(`https://(?:media|image)\.themoviedb\.org/t/p/[a-zA-Z0-9_]+/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp|svg)`)
	giphyRegex = regexp.MustCompile(`https://media[a-zA-Z0-9\.\-]*giphy\.com/[^"]*giphy\.mp4`)
)

func SearchStudioLogo(c fiber.Ctx) error {
	name := c.Query("name")
	if name == "" {
		return c.Status(400).SendString("Missing name parameter")
	}

	// Check local custom logos first
	if localPath := findLocalStudioFile(name); localPath != "" {
		return c.SendFile(localPath)
	}

	cacheMutex.RLock()
	if cachedUrl, ok := logoCache[name]; ok {
		cacheMutex.RUnlock()
		if cachedUrl == "" {
			return c.Status(404).SendString("Logo not found")
		}
		return c.Redirect().Status(302).To(cachedUrl)
	}
	cacheMutex.RUnlock()

	searchUrl := fmt.Sprintf("https://www.themoviedb.org/search/company?query=%s", url.QueryEscape(name))
	
	req, _ := http.NewRequest("GET", searchUrl, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	
	resp, err := httpClient.Do(req)
	if err != nil {
		return c.Status(500).SendString("Failed to fetch TMDB")
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).SendString("Failed to read response")
	}

	htmlStr := string(bodyBytes)
	companyIndex := strings.Index(htmlStr, `class="search_results company`)
	var match string
	if companyIndex != -1 {
		match = tmdbRegex.FindString(htmlStr[companyIndex:])
	}
	
	if match != "" {
		// Convert from thumbnail size to original size
		// e.g. https://media.themoviedb.org/t/p/w94_and_h141_face/xyz.png -> https://image.tmdb.org/t/p/original/xyz.png
		parts := strings.Split(match, "/")
		filename := parts[len(parts)-1]
		highResMatch := fmt.Sprintf("https://image.tmdb.org/t/p/original/%s", filename)
		
		cacheMutex.Lock()
		logoCache[name] = highResMatch
		cacheMutex.Unlock()

		return c.Redirect().Status(302).To(highResMatch)
	}

	return c.Status(404).SendString("Logo not found")
}

func getKebabCase(name string) string {
	// Remove common punctuation
	name = strings.ReplaceAll(name, ".", "")
	name = strings.ReplaceAll(name, ",", "")
	name = strings.ReplaceAll(name, "'", "")
	return strings.ToLower(strings.ReplaceAll(name, " ", "-"))
}

func SearchStudioVideo(c fiber.Ctx) error {
	name := c.Query("name")
	if name == "" {
		return c.Status(400).SendString("Missing name parameter")
	}

	if videoPath := findLocalStudioVideo(name); videoPath != "" {
		return c.SendFile(videoPath)
	}

	return c.Status(404).SendString("Local video not found")
}

func findLocalStudioFile(studioName string) string {
	safeName := strings.ReplaceAll(studioName, "/", "-")
	safeName = strings.ReplaceAll(safeName, "\\", "-")
	kebabName := getKebabCase(safeName)
	extensions := []string{"svg", "webp", "png", "jpg"}

	dirs := []string{"assets/studios", "backend/assets/studios"}
	for _, dir := range dirs {
		for _, ext := range extensions {
			path1 := filepath.Join(dir, fmt.Sprintf("%s.%s", safeName, ext))
			if _, err := os.Stat(path1); err == nil {
				return path1
			}
			path2 := filepath.Join(dir, fmt.Sprintf("%s.%s", kebabName, ext))
			if _, err := os.Stat(path2); err == nil {
				return path2
			}
		}
	}
	return ""
}

func findLocalStudioVideo(studioName string) string {
	safeName := strings.ReplaceAll(studioName, "/", "-")
	safeName = strings.ReplaceAll(safeName, "\\", "-")
	kebabName := getKebabCase(safeName)

	dirs := []string{"assets/studios", "backend/assets/studios"}
	for _, dir := range dirs {
		path1 := filepath.Join(dir, fmt.Sprintf("%s.mp4", safeName))
		if _, err := os.Stat(path1); err == nil {
			return path1
		}
		path2 := filepath.Join(dir, fmt.Sprintf("%s.mp4", kebabName))
		if _, err := os.Stat(path2); err == nil {
			return path2
		}
	}
	return ""
}
