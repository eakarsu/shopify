export default function SizeGuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Size Guide</h1>
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Clothing Sizes</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-3">Size</th><th className="border p-3">Chest (in)</th><th className="border p-3">Waist (in)</th><th className="border p-3">Hip (in)</th></tr></thead><tbody><tr><td className="border p-3 text-center">XS</td><td className="border p-3 text-center">32-34</td><td className="border p-3 text-center">26-28</td><td className="border p-3 text-center">34-36</td></tr><tr><td className="border p-3 text-center">S</td><td className="border p-3 text-center">34-36</td><td className="border p-3 text-center">28-30</td><td className="border p-3 text-center">36-38</td></tr><tr><td className="border p-3 text-center">M</td><td className="border p-3 text-center">36-38</td><td className="border p-3 text-center">30-32</td><td className="border p-3 text-center">38-40</td></tr><tr><td className="border p-3 text-center">L</td><td className="border p-3 text-center">38-40</td><td className="border p-3 text-center">32-34</td><td className="border p-3 text-center">40-42</td></tr><tr><td className="border p-3 text-center">XL</td><td className="border p-3 text-center">40-42</td><td className="border p-3 text-center">34-36</td><td className="border p-3 text-center">42-44</td></tr></tbody></table>
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Shoe Sizes</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-3">US</th><th className="border p-3">EU</th><th className="border p-3">UK</th><th className="border p-3">CM</th></tr></thead><tbody><tr><td className="border p-3 text-center">6</td><td className="border p-3 text-center">39</td><td className="border p-3 text-center">5.5</td><td className="border p-3 text-center">24</td></tr><tr><td className="border p-3 text-center">7</td><td className="border p-3 text-center">40</td><td className="border p-3 text-center">6.5</td><td className="border p-3 text-center">25</td></tr><tr><td className="border p-3 text-center">8</td><td className="border p-3 text-center">41</td><td className="border p-3 text-center">7.5</td><td className="border p-3 text-center">26</td></tr><tr><td className="border p-3 text-center">9</td><td className="border p-3 text-center">42</td><td className="border p-3 text-center">8.5</td><td className="border p-3 text-center">27</td></tr><tr><td className="border p-3 text-center">10</td><td className="border p-3 text-center">43</td><td className="border p-3 text-center">9.5</td><td className="border p-3 text-center">28</td></tr></tbody></table>
          </div>
        </section>
      </div>
    </div>
  )
}
