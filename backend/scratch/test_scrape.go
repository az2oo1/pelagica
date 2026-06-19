package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

func main() {
	studioName := "Marvel Studios"
	searchUrl := fmt.Sprintf("https://www.themoviedb.org/search/company?query=%s", url.QueryEscape(studioName))
	
	req, err := http.NewRequest("GET", searchUrl, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")
	
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error executing request: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	fmt.Printf("Response Status: %d\n", resp.StatusCode)
	
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading body: %v\n", err)
		return
	}
	
	htmlStr := string(bodyBytes)
	fmt.Printf("HTML body length: %d\n", len(htmlStr))
	
	companyIndex := strings.Index(htmlStr, `class="search_results company`)
	fmt.Printf("companyIndex: %d\n", companyIndex)
	
	if companyIndex != -1 {
		snippet := htmlStr[companyIndex : companyIndex+1000]
		fmt.Printf("Snippet: %s\n", snippet)
		
		tmdbRegex := regexp.MustCompile(`https://(?:media|image)\.themoviedb\.org/t/p/[a-zA-Z0-9_]+/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp|svg)`)
		match := tmdbRegex.FindString(htmlStr[companyIndex:])
		fmt.Printf("Match: %s\n", match)
	} else {
		// print first 500 chars of body to see what it is
		limit := 500
		if len(htmlStr) < limit {
			limit = len(htmlStr)
		}
		fmt.Printf("First chars: %s\n", htmlStr[:limit])
	}
}
